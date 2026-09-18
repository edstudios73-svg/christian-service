import { BetaAnalyticsDataClient } from 'npm:@google-analytics/data';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

function normalizeRange(range: string | undefined) {
  const safe = String(range || 'last_30_days').trim().toLowerCase();
  const allowed = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'last_90_days'];
  return allowed.includes(safe) ? safe : 'last_30_days';
}

function dateRangeFrom(range: string) {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(end.getDate() - 1);
      end.setDate(end.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
      start.setDate(end.getDate() - 6);
      break;
    case 'last_30_days':
      start.setDate(end.getDate() - 29);
      break;
    case 'last_90_days':
      start.setDate(end.getDate() - 89);
      break;
    default:
      start.setDate(end.getDate() - 29);
      break;
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
}

async function readGoogleAnalyticsReport(propertyId: string, range: string) {
  const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY');
  const projectPropertyId = propertyId || Deno.env.get('GA4_PROPERTY_ID');

  if (!projectPropertyId || !clientEmail || !privateKey) {
    return {
      status: 'configuration_required',
      configured: false,
      message: 'Google Analytics is not connected yet. Add the GA4 property and service-account credentials to the server environment.'
    };
  }

  const cleanPrivateKey = privateKey.replace(/\\n/g, '\n');

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: cleanPrivateKey
      }
    });

    const safeRange = normalizeRange(range);
    const period = dateRangeFrom(safeRange);

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${projectPropertyId}`,
      dateRanges: [{ startDate: period.startDate, endDate: period.endDate }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'keyEvents' }
      ],
      dimensions: [{ name: 'date' }],
      limit: 1000
    });

    const rows = (response.rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || '',
      totalUsers: Number(row.metricValues?.[0]?.value || 0),
      activeUsers: Number(row.metricValues?.[1]?.value || 0),
      newUsers: Number(row.metricValues?.[2]?.value || 0),
      sessions: Number(row.metricValues?.[3]?.value || 0),
      pageViews: Number(row.metricValues?.[4]?.value || 0),
      engagementRate: Number(row.metricValues?.[5]?.value || 0),
      keyEvents: Number(row.metricValues?.[6]?.value || 0)
    }));

    return {
      status: 'connected',
      configured: true,
      summary: {
        totalUsers: rows.reduce((a, b) => a + b.totalUsers, 0),
        activeUsers: rows.reduce((a, b) => a + b.activeUsers, 0),
        newUsers: rows.reduce((a, b) => a + b.newUsers, 0),
        sessions: rows.reduce((a, b) => a + b.sessions, 0),
        pageViews: rows.reduce((a, b) => a + b.pageViews, 0),
        engagementRate: rows.length ? rows.reduce((a, b) => a + b.engagementRate, 0) / rows.length : 0,
        keyEvents: rows.reduce((a, b) => a + b.keyEvents, 0)
      },
      trend: rows,
      topPages: [],
      sources: [],
      devices: [],
      countries: [],
      events: [],
      realtime: [],
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Analytics Data API error';
    return {
      status: 'google_api_error',
      configured: true,
      message: 'The Google Analytics API is not responding properly. Check the GA4 property access and service-account permissions.',
      rawError: message
    };
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ status: 'configuration_required', configured: false, message: 'Supabase environment settings are missing.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ status: 'unauthorized', configured: false, message: 'Admin authentication is required.' }, 401);

    const supabaseAdmin = await import('npm:@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(supabaseUrl, serviceKey)
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return json({ status: 'unauthorized', configured: false, message: 'Your admin session is invalid.' }, 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin.from('users').select('role').eq('id', authData.user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin') {
      return json({ status: 'unauthorized', configured: false, message: 'Admin access is required for analytics.' }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const range = normalizeRange(body.range || body.dateRange || 'last_30_days');

    const propertyId = body.propertyId || Deno.env.get('GA4_PROPERTY_ID') || '';
    const report = await readGoogleAnalyticsReport(propertyId, range);
    const response = { ...report, range, propertyId: propertyId || 'not-set', requestedAt: new Date().toISOString() };
    return json(response, response.status === 'configuration_required' || response.status === 'unauthorized' ? 200 : 200);
  } catch (error) {
    console.error('google-analytics-report failed', error);
    return json({ status: 'google_api_error', configured: false, message: 'Google Analytics could not be reached from the server.' }, 500);
  }
});
