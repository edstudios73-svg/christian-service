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
