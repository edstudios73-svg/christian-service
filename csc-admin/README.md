# Christian Service Church: admin page

Files
- admin.html: the admin dashboard (updates, sermons, gallery, testimonies, events, prayer requests)
- supabase-setup.sql: tables, security rules and photo storage for Supabase (run in 3 steps)
- public-site-example.html: example code for showing sermons and sending prayer requests on your public pages

Set up (about 10 minutes)
1. Create a free project at supabase.com and wait for it to finish setting up.
2. SQL Editor > New query. Open supabase-setup.sql and run STEP 1, then STEP 2, then STEP 3, one at a time.
   Before STEP 2, change admin@yourchurch.org to your own admin email.
3. Authentication > Users > Add user > Create new user. Use that same email, set a password, tick Auto Confirm User.
   Then turn off "Allow new users to sign up" in the sign-in settings.
4. Project Settings > API. Copy the Project URL and the anon (or publishable) key.
   Paste them into SUPABASE_URL and SUPABASE_ANON_KEY at the top of admin.html (keep the quotes).
   Change DEMO_PASSWORD to something private.
5. Add admin.html to your website's files and redeploy on Netlify.
   Open https://cscofficials.netlify.app/admin.html and sign in with your admin email and password.
6. To show posts on your public pages, use public-site-example.html as a starting point.

Until SUPABASE_URL and SUPABASE_ANON_KEY are filled in, admin.html runs in demo mode:
data stays in your browser only, and the starter password is csc2026.

Notes
- Photos are shrunk in the browser and stored in a Supabase Storage bucket named "media".
- Run each SQL step only once. A "policy already exists" message on a re-run is harmless.
- Use Setup and backup inside the admin to download a JSON backup of everything.
