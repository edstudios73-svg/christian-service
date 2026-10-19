import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildWelcomeSms, normalizeGhPhone, sendBatch } from '../_shared/sms.ts';

// Called by the website right after someone subscribes. It only ever sends to a number that is
// already an active subscriber and has not been welcomed yet, so it cannot be used to message strangers.
// Secrets: SMS_API_KEY, SMS_SENDER_ID (default CSC-UPDATES), SMS_MODE ("sandbox" delivers nothing).

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get('SMS_API_KEY');
    if (!apiKey) return json({ sent: false, reason: 'not_configured' });
    const senderId = (Deno.env.get('SMS_SENDER_ID') || 'CSC-UPDATES').slice(0, 11);
    const sandbox = (Deno.env.get('SMS_MODE') || 'live').toLowerCase() === 'sandbox';
    const body = await request.json().catch(() => ({}));
    const phone = normalizeGhPhone(body.phone);
    if (!phone) return json({ sent: false, reason: 'invalid_phone' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    // Claim the welcome atomically: only the first call for a fresh, active subscriber gets a row back.
    const { data: claimed } = await admin.from('sms_subscribers').update({ welcome_sent_at: new Date().toISOString() })
      .eq('phone', phone).eq('status', 'active').eq('source', 'website').is('welcome_sent_at', null)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()).select('name').maybeSingle();
    if (!claimed) return json({ sent: false, reason: 'already_welcomed' });

    const message = buildWelcomeSms(claimed.name);
    const result = await sendBatch({ apiKey, sender: senderId, recipients: [phone], message, sandbox });
    await admin.from('sms_messages').insert({
      kind: 'welcome', message, sender_id: senderId, mode: sandbox ? 'sandbox' : 'live', recipients_count: result.recipients,
      credits_deducted: result.credits, job_ids: result.jobIds, status: result.ok ? 'sent' : 'failed', error: result.error ?? null, completed_at: new Date().toISOString(),
    });
    return json({ sent: result.ok, ...(result.ok ? {} : { reason: 'send_failed' }) });
  } catch (error) {
    console.error(error);
    return json({ sent: false, reason: 'error' }, 500);
  }
});
