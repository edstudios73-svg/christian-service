# Google Analytics 4 setup for the admin dashboard

This project is configured to support Google Analytics 4 without exposing private credentials in browser code.

Google Analytics account owner:
- baidenzstudioz@gmail.com

## 1. Create or select the GA4 property

1. Sign in with the Google account tied to baidenzstudioz@gmail.com.
2. Open Google Analytics.
3. Create a new GA4 property or select the correct existing property.
4. Copy the property ID from the GA4 admin area.

## 2. Create the web data stream

1. In GA4, open Admin.
2. Go to Data collection and modification > Data streams.
3. Create a web data stream for the public site.
4. Copy the Measurement ID. It will look like `G-XXXXXXXXXX`.

## 3. Add the public Measurement ID

Add the real value in the public site code where the placeholder is used:

- `js/ga4.js`
- or the page-level snippet in the website HTML

Use:

```js
window.CSC_GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
```

Replace `G-XXXXXXXXXX` with the real GA4 Measurement ID for the live website.

## 4. Find the GA4 property ID

In Google Analytics:

1. Open Admin.
2. Select the property.
3. Under Property, copy the Property ID.

This value is used on the server side and should be kept in environment variables, not in browser code.

## 5. Create a Google Cloud project

1. Open Google Cloud Console.
2. Create a new project or select an existing one.
3. Enable billing for the project if required by your Google Workspace setup.

## 6. Enable the Google Analytics Data API

1. In the Google Cloud project, go to APIs & Services > Library.
2. Search for `Google Analytics Data API`.
3. Enable it.

## 7. Create a service account

1. Open IAM & Admin > Service Accounts.
2. Create a service account.
3. Copy the generated service account email.
4. Create a key in JSON format and keep it in a secure server environment.

## 8. Grant GA4 property access

1. In Google Analytics, open Admin > Property > Property access management.
2. Add the service account email as a user with at least Viewer access.
3. This allows the admin dashboard to read GA4 reports securely from the server.

## 9. Required environment variables for the server

Add these to the server environment for the Supabase Edge Function or any backend hosting that supports secret variables:

```env
GA4_PROPERTY_ID=XXXXXXXXX
GOOGLE_CLIENT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The private key must remain server-side only.

## 10. Where to add the values

For this repo, the server-side variables should be added in the Supabase project secrets or the deployment platform used by the Edge Function.

Do not put the private key in any browser file or front-end bundle.

## 11. Test the connection

1. Sign in to the admin dashboard.
2. Open the Analytics section.
3. Confirm the status shows `Connected`.
4. Refresh the page and confirm the summary metrics populate.
5. Change the date range and confirm the chart updates.

If the credentials are missing, the dashboard will show `Configuration Required` instead of pretending to be connected.

## 12. Deploy safely

- Keep all Google service-account credentials in server-managed secrets.
- Never commit them to Git.
- Never expose them via browser JavaScript.
- Keep the public Measurement ID in front-end code only.
- Use the server-side Analytics API for all dashboard reports.

## 13. Notes

- The public website sends standard GA4 page_view data.
- The admin dashboard reads from the Google Analytics Data API using the service account.
- The site will show `No data available` until real GA4 data is present.
