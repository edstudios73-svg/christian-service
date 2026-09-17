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
