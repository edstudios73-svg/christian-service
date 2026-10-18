import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMS_BASE_URL, buildAnnouncementSms, chunk, normalizeGhPhone, sendBatch, toGsmText } from '../_shared/sms.ts';

// Secrets (never put these in the website or the repository):
//   SMS_API_KEY    your SasuSync API key
//   SMS_SENDER_ID  defaults to CSC-UPDATES
//   SMS_MODE       "live" (default) or "sandbox" (delivers nothing, costs nothing)

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
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
