# Christian Service Church: admin page

Files
- admin.html: the admin dashboard (updates, sermons, gallery, testimonies, events, prayer requests)
- supabase-setup.sql: tables, security rules and photo storage for Supabase (run in 3 steps)
- public-site-example.html: example code for showing sermons and sending prayer requests on your public pages

Set up (about 10 minutes)
1. Create a free project at supabase.com and wait for it to finish setting up.
2. SQL Editor > New query. Open supabase-setup.sql and run STEP 1, then STEP 2, then STEP 3, one at a time.
   The configured administrator email is edstudios77@gmail.com.
3. Authentication > Users > Add user > Create new user. Use edstudios77@gmail.com, set a password, and tick Auto Confirm User.
   Then turn off "Allow new users to sign up" in the sign-in settings.
4. The live Supabase Project URL and anon key are already configured in admin.html and js/supabase-public.js.
   Never place a service_role key in either browser file.
5. Add admin.html to your website's files and redeploy on Netlify.
   Open https://cscofficials.netlify.app/admin.html and sign in with your admin email and password.
6. To show posts on your public pages, use public-site-example.html as a starting point.

The admin dashboard uses Supabase when the configured Auth user is available. The DEMO_PASSWORD fallback is for local testing only and is not real security.

Notes
- Photos are shrunk in the browser and stored in a Supabase Storage bucket named "media".
- Run each SQL step only once. A "policy already exists" message on a re-run is harmless.
- The reset statements at the bottom are commented out. Uncomment them only when intentionally clearing all content.
- Use Setup and backup inside the admin to download a JSON backup of everything.

Deploy on Vercel
1. Push the project to GitHub, then open vercel.com and choose Add New Project.
2. Import the repository `edstudios73-svg/christian-service`.
3. Set the Root Directory to `christian-service-church` because the static site is inside that folder.
4. Leave Framework Preset as Other. Leave Build Command empty and Output Directory as `.`.
5. Click Deploy. Vercel will serve `index.html` and the other HTML pages as a static site.
6. In Supabase, open Authentication > URL Configuration. Set the Site URL to your Vercel URL, for example `https://your-project.vercel.app`.
7. Add the Vercel URL and any custom domain URL to Additional Redirect URLs, then save.
8. Test the public site and open `/csc-admin/admin.html`. Sign in with the confirmed `edstudios77@gmail.com` Auth user.

The browser uses the Supabase URL and anon key already stored in `admin.html` and `js/supabase-public.js`. Do not add a Supabase service-role key to Vercel or any browser file. If you later move the credentials to Vercel environment variables, use only a public anon key in client-side code.

Push notifications and unread badges
------------------------------------
1. Run the added notification SQL in `supabase-setup.sql`. It creates `push_subscriptions`, `announcement_reads`, `notification_events`, the required RLS policies, and supports anonymous device identities used by the public PWA.
2. In Supabase Authentication > Providers, enable Anonymous sign-ins. Anonymous users are used only to isolate read state and subscriptions per browser/device; no private admin data is exposed.
3. Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Put the public key in `js/push-config.js`. Keep the private key out of the repository.
4. Deploy `supabase/functions/send-announcement-notification` with the Supabase CLI. Set these function secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never copy the service-role key into browser code.
5. The admin calls the Edge Function only when a draft changes to published. The `notification_events` unique constraint prevents duplicate sends for the same announcement. Expired subscriptions are deactivated automatically.
6. The public PWA asks for permission only after the user selects `Enable notifications`. Without permission, announcements and the in-app count continue to work normally.

The in-app count and favicon count use the signed-in anonymous device's `announcement_reads` rows. The Web Badging API is feature-detected; unsupported browsers retain the in-app and favicon fallback. Push delivery and background notifications require HTTPS, a deployed Edge Function, valid VAPID secrets, and a browser/OS that supports Web Push.

Testing
-------
- Run the SQL and deploy the function before testing push delivery.
- Open the deployed HTTPS site, select `Enable notifications`, then publish a new announcement from the authenticated admin.
- Test once with the PWA open and once after closing it. Click the notification and confirm it opens `announcements.html#<announcement-id>` and reduces the unread count.
- Use a second browser/device to confirm subscriptions and read state are independent.
- In DevTools, disable notifications or clear permission and confirm the public announcements page still loads without errors.

## SMS announcements and updates (SasuSync)

SMS is sent by the Supabase Edge Function `send-sms-announcement`. The SasuSync API key lives only in Supabase as a secret. Never put it in this repository, `admin.html` or any browser file.

1. Run `sms-setup.sql` in the Supabase SQL Editor (creates `sms_subscribers` and `sms_messages`; the last query is a health check).
2. Deploy the function. Easiest: Supabase Dashboard > Edge Functions > Deploy a new function > Via Editor, name it `send-sms-announcement`, paste the whole of `send-sms-announcement.single-file.ts`, and deploy. Then open the function's settings and switch **Verify JWT OFF** (the function checks that you are the admin itself; with it ON the browser is blocked and the admin shows "Failed to send a request to the Edge Function"). With the CLI instead: `supabase functions deploy send-sms-announcement --project-ref <project-ref>`.
3. Save the secrets (Dashboard > Edge Functions > Secrets): `SMS_API_KEY` = your SasuSync key and `SMS_SENDER_ID` = `CSC-UPDATES`. Do not set `SMS_MODE` (or set it to `live`). `SMS_MODE=sandbox` is only for testing: nothing is delivered and nothing is charged.
4. In SasuSync, make sure the sender ID `CSC-UPDATES` is approved and the account has SMS credits (1 credit per message part, per recipient).
5. In the admin: add numbers under **SMS Subscribers** (visitors can also subscribe from the website footer), then tick **Also send as SMS to subscribers** when publishing an announcement.

## Ministry sites (members only, one admin door)

Each ministry (except Children) has a members-only page at `www.christianservicechurch.org/m/<ministry>` (and at `<ministry>.christianservicechurch.org` once the subdomain is connected). The ministries are `mediateam`, `youth`, `prayer`, `ushers`, `choir` and `evangelism`.

1. Supabase > SQL Editor: run `ministry-sites-setup.sql` once. It creates the tables, locks them so nothing can be read straight from the browser, and adds the sign-in and management functions.
2. Members: Admin > Members and logins > Add member or Import list. Each person gets an index number (for example CSC-0001) and a password. They sign in on any ministry page with those.
3. Ministry heads: Admin > Members and logins > Ministry head logins. Each ministry has one code and password. The head opens the normal admin sign-in page, taps "Ministry head? Sign in with your ministry code", and lands in the admin for their ministry only. The church admin can open every ministry at `/m/<ministry>/admin`.
4. Subdomains: in Cloudflare add a CNAME record for each ministry name pointing to `cname.vercel-dns.com` (DNS only), then add the domain to the Vercel project.

### Link previews and the ministry pictures
- Each ministry has its own link preview (picture, name and motto) so a shared address looks right on WhatsApp and Facebook. The pages are built from `ministry.html` by `python3 scripts/build-ministry-pages.py`, and the pictures by `python3 scripts/make-ministry-previews.py`. Run the first one again after changing `ministry.html`.
- The main picture at the top of a ministry's page is the picture chosen for that ministry in Admin > Ministries. Change it there and the ministry page follows right away (run `ministry-sites-update-hero.sql` once if you set up before this existed). The link-preview picture does not change.
