// PASTE THIS WHOLE FILE into Supabase > Edge Functions > Deploy a new function (name: send-sms-announcement).
// Generated from supabase/functions/send-sms-announcement + _shared/sms.ts. Turn OFF "Verify JWT" for this function.
import { createClient } from 'npm:@supabase/supabase-js@2';

// ===== SMS helpers (SasuSync) =====
// Helpers for the SasuSync bulk SMS API (https://sms.sasusync.com/docs/api).
// Pure functions only, so they can be tested without Supabase or Deno.

export const SMS_BASE_URL = 'https://sms.sasusync.com';
export const SITE_URL = 'christianservicechurch.org';
const BATCH_SIZE = 500;
const MAX_MESSAGE_CHARS = 306; // 2 SMS parts per recipient

/** 0551234567 / +233551234567 / 551234567 -> 233551234567 (same rules as the database). */
export function normalizeGhPhone(raw: unknown): string | null {
  let digits = String(raw ?? '').replace(/[^0-9]/g, '');
  if (digits.length === 14 && digits.startsWith('00233')) digits = digits.slice(2);
  if (/^233\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return `233${digits.slice(1)}`;
  if (/^\d{9}$/.test(digits)) return `233${digits}`;
  return null;
}

/** Plain GSM-safe text: curly quotes, dashes and emoji would switch the SMS to a 70-character encoding. */
export function toGsmText(text: unknown): string {
  return String(text ?? '')
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2000-\u200B]/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** "Title\nBody...\n- Christian Service Church\nchristianservicechurch.org", capped at two SMS parts. */
export function buildAnnouncementSms(title: unknown, body: unknown): string {
  const tail = `\n- Christian Service Church\n${SITE_URL}`;
  const head = toGsmText(title);
  const details = toGsmText(body).replace(/\s*\n\s*/g, ' ');
  let text = details ? `${head}\n${details}` : head;
  const room = MAX_MESSAGE_CHARS - tail.length;
  if (text.length > room) text = `${text.slice(0, room - 3).trimEnd()}...`;
  return text + tail;
}

export function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Turns a SasuSync error response into a sentence the admin can act on. */
export function explainSmsError(status: number, detail: unknown): string {
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail ?? '');
  if (status === 401) return 'The SMS API key is missing or invalid. Check the SMS_API_KEY secret.';
  if (status === 402) return 'Not enough SMS credits. Top up your SasuSync account, then try again.';
  if (status === 403) return `SMS was refused: ${text || 'the sender ID may not be approved yet.'}`;
  if (status === 422 || status === 400) return `SMS request was rejected: ${text}`;
  if (status === 429) return 'Too many SMS requests right now. Please try again in a minute.';
  return text || `SMS provider error (${status}).`;
}

export interface SendResult {
  ok: boolean;
  recipients: number;
  credits: number;
  jobIds: string[];
  error?: string;
  uncertain?: boolean; // a timeout: the batch may still have been sent, so never auto-retry
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Sends one batch. Retries only on clear "nothing was sent" failures (429 / 5xx), never on timeouts. */
export async function sendBatch(
  opts: { apiKey: string; sender: string; recipients: string[]; message: string; sandbox?: boolean },
  fetchImpl: FetchLike = fetch,
): Promise<SendResult> {
  const url = `${SMS_BASE_URL}${opts.sandbox ? '/smssandbox/v1/send' : '/api/v1/send'}`;
  const body = JSON.stringify({ sender: opts.sender, recipients: opts.recipients, message: opts.message });
  let lastError = 'SMS provider unavailable.';
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'X-API-Key': opts.apiKey, 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.success !== false) {
        return {
          ok: true,
          recipients: Number(payload?.data?.recipients_count ?? opts.recipients.length),
          credits: Number(payload?.charged?.units ?? payload?.balance?.deducted ?? payload?.data?.total_credits_used ?? 0),
          jobIds: (payload?.data?.task_id ?? payload?.data?.job_id) != null ? [String(payload?.data?.task_id ?? payload?.data?.job_id)] : [],
        };
      }
      lastError = explainSmsError(response.status, payload?.detail ?? payload?.message);
      if (response.status !== 429 && response.status < 500) {
        return { ok: false, recipients: 0, credits: 0, jobIds: [], error: lastError };
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return { ok: false, recipients: 0, credits: 0, jobIds: [], uncertain: true, error: 'The SMS provider timed out. The batch may still be delivered, so check before resending.' };
      }
      lastError = 'Could not reach the SMS provider.';
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  return { ok: false, recipients: 0, credits: 0, jobIds: [], error: lastError };
}

// ===== Edge function =====

// Secrets (never put these in the website or the repository):
//   SMS_API_KEY    your SasuSync API key
//   SMS_SENDER_ID  defaults to CSC-UPDATES
//   SMS_MODE       "live" (default) or "sandbox" (delivers nothing, costs nothing)

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const apiKey = Deno.env.get('SMS_API_KEY');
    const senderId = (Deno.env.get('SMS_SENDER_ID') || 'CSC-UPDATES').slice(0, 11);
    const sandbox = (Deno.env.get('SMS_MODE') || 'live').toLowerCase() === 'sandbox';

    // Only a signed-in admin may use this function.
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization' }, 401);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);
    const { data: profile } = await admin.from('users').select('role').eq('id', authData.user.id).maybeSingle();
    if (profile?.role !== 'admin') return json({ error: 'Admin access required' }, 403);
    if (!apiKey) return json({ error: 'SMS is not configured yet: the SMS_API_KEY secret is missing.' }, 500);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'send');

    // ---- Status: balance, sender ID approval and subscriber count ----
    if (action === 'status') {
      const headers = { 'X-API-Key': apiKey };
      const [balance, sender] = await Promise.all([
        fetch(`${SMS_BASE_URL}/api/v1/balance`, { headers }).then((r) => r.json()).catch(() => null),
        fetch(`${SMS_BASE_URL}/sender/id/status?sender_name=${encodeURIComponent(senderId)}`, { headers }).then((r) => r.json()).catch(() => null),
      ]);
      const { count } = await admin.from('sms_subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active');
      return json({
        mode: sandbox ? 'sandbox' : 'live',
        sender_id: senderId,
        sender_status: sender?.status ?? 'unknown',
        sms_credits: balance?.sms_credits ?? null,
        active_subscribers: count ?? 0,
      });
    }

    // ---- Test: one message to one number (to check everything works) ----
    if (action === 'test') {
      const phone = normalizeGhPhone(body.phone);
      if (!phone) return json({ error: 'Enter a valid Ghana phone number.' }, 400);
      const message = toGsmText(body.message || 'Test message from Christian Service Church.').slice(0, 160);
      const result = await sendBatch({ apiKey, sender: senderId, recipients: [phone], message, sandbox });
      await admin.from('sms_messages').insert({
        kind: 'test', message, sender_id: senderId, mode: sandbox ? 'sandbox' : 'live', recipients_count: result.recipients,
        credits_deducted: result.credits, job_ids: result.jobIds, status: result.ok ? 'sent' : 'failed', error: result.error ?? null,
        triggered_by: authData.user.id, completed_at: new Date().toISOString(),
      });
      if (!result.ok) return json({ error: result.error }, 502);
      return json({ sent: 1, credits: result.credits, mode: sandbox ? 'sandbox' : 'live' });
    }

    // ---- Announcement: send to every active subscriber ----
    const announcementId = String(body.announcement_id || '');
    if (!announcementId) return json({ error: 'announcement_id is required' }, 400);
    const { data: announcement, error: announcementError } = await admin.from('announcements').select('id,title,body,published').eq('id', announcementId).maybeSingle();
    if (announcementError) throw announcementError;
    if (!announcement?.published) return json({ recipients: 0, skipped: 'Announcement is not published' });

    const { data: subscribers, error: subscriberError } = await admin.from('sms_subscribers').select('phone').eq('status', 'active');
    if (subscriberError) throw subscriberError;
    const recipients = [...new Set((subscribers || []).map((s) => s.phone as string))];
    if (!recipients.length) return json({ recipients: 0, skipped: 'No active SMS subscribers yet' });

    const message = buildAnnouncementSms(announcement.title, announcement.body);
    const mode = sandbox ? 'sandbox' : 'live';
    const { data: log, error: logError } = await admin.from('sms_messages').insert({
      kind: 'announcement', announcement_id: announcement.id, message, sender_id: senderId, mode, recipients_count: recipients.length, triggered_by: authData.user.id,
    }).select('id').maybeSingle();
    if (logError) {
      if (logError.code === '23505') return json({ recipients: 0, skipped: 'Already sent by SMS' });
      throw logError;
    }

    let delivered = 0, credits = 0;
    const jobIds: string[] = [];
    const errors: string[] = [];
    for (const batch of chunk(recipients)) {
      const result = await sendBatch({ apiKey, sender: senderId, recipients: batch, message, sandbox });
      if (result.ok) { delivered += result.recipients; credits += result.credits; jobIds.push(...result.jobIds); } else errors.push(result.error || 'Send failed');
    }
    const status = errors.length === 0 ? 'sent' : delivered > 0 ? 'partial' : 'failed';
    await admin.from('sms_messages').update({
      status, recipients_count: delivered, credits_deducted: credits, job_ids: jobIds, error: errors.join(' | ') || null, completed_at: new Date().toISOString(),
    }).eq('id', log!.id);
    if (status === 'failed') return json({ error: errors[0] }, 502);
    return json({ recipients: delivered, credits, mode, status, ...(errors.length ? { warning: errors[0] } : {}) });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'SMS delivery failed' }, 500);
  }
});
