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
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[  -​]/g, ' ')
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
