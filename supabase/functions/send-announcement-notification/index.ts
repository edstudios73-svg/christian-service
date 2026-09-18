import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@christianservicechurch.org';
    const admin = createClient(supabaseUrl, serviceKey);
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing authorization' }, 401);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);
    const { data: profile, error: profileError } = await admin.from('users').select('role').eq('id', authData.user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin') return json({ error: 'Admin access required' }, 403);

    const { announcement_id: announcementId } = await request.json();
    if (!announcementId) return json({ error: 'announcement_id is required' }, 400);
    const { data: announcement, error: announcementError } = await admin.from('announcements').select('id,title,body,published').eq('id', announcementId).maybeSingle();
    if (announcementError) throw announcementError;
    if (!announcement?.published) return json({ sent: 0, skipped: 'Announcement is not published' });

    const { data: event, error: eventError } = await admin.from('notification_events').upsert({ announcement_id: announcementId, triggered_by: authData.user.id }, { onConflict: 'announcement_id', ignoreDuplicates: true }).select('id').maybeSingle();
    if (eventError) throw eventError;
    if (!event) return json({ sent: 0, skipped: 'Already notified' });

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').eq('active', true);
    if (subscriptionError) throw subscriptionError;
    let sent = 0;
    for (const subscription of subscriptions || []) {
      try {
        const { count: total } = await admin.from('announcements').select('id', { count: 'exact', head: true }).eq('published', true);
        const { data: reads } = await admin.from('announcement_reads').select('announcement_id').eq('user_id', subscription.user_id);
        const readIds = new Set((reads || []).map((read) => String(read.announcement_id)));
        const { data: published } = await admin.from('announcements').select('id').eq('published', true);
        const unread = Math.max(0, Number(total || 0) - (published || []).filter((item) => readIds.has(String(item.id))).length);
        const body = JSON.stringify({ announcementId: announcement.id, title: announcement.title, body: String(announcement.body || '').slice(0, 180), badgeCount: unread, url: `/announcements.html#${encodeURIComponent(announcement.id)}` });
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, body);
        sent++;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').update({ active: false }).eq('id', subscription.id);
      }
    }
    await admin.from('notification_events').update({ sent_count: sent, sent_at: new Date().toISOString() }).eq('id', event.id);
    return json({ sent });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Notification delivery failed' }, 500);
  }
});
