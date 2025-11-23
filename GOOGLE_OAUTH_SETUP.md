# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for Balik Suling.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Name it something like "Balik Suling" or "Balik Suling Auth"

## Step 2: Enable Google+ API

1. In your project, go to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in:
     - App name: `Balik Suling`
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Skip scopes (click **Save and Continue**)
   - Add test users if needed
   - Click **Save and Continue**

4. Back at Create OAuth client ID:
   - Application type: **Web application**
   - Name: `Balik Suling Web Client`
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://127.0.0.1:3000`
     - Add your production domain when ready (e.g., `https://yourdomain.com`)
   - Authorized redirect URIs:
     - `http://localhost:3000`
     - `http://127.0.0.1:3000`
     - Add your production domain when ready
   - Click **Create**

5. Copy the **Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)

## Step 4: Configure Your App

1. Open the `.env` file in your project root
2. Replace the placeholder with your actual Client ID:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com
   ```
3. Save the file

## Step 5: Restart Your Development Server

If your app is running, restart it to load the new environment variable:

```bash
# Stop the server (Ctrl+C)
# Start it again
npm start
```

## Step 6: Test the Integration

1. Go to your login page
2. Click the **Continue with Google** button
3. You should see the Google sign-in popup
4. Select your Google account
5. Grant permissions
6. You should be redirected to the feed page

## Troubleshooting

### "Invalid Client ID" Error
- Make sure you copied the entire Client ID correctly
- Verify the `.env` file has the correct format
- Restart your development server after changing `.env`

### "Redirect URI mismatch" Error
- Go back to Google Cloud Console > Credentials
- Edit your OAuth client
- Make sure `http://localhost:3000` and `http://127.0.0.1:3000` are in the Authorized JavaScript origins

### Google Sign-in Button Not Showing
- Check browser console for errors
- Verify `@react-oauth/google` and `jwt-decode` packages are installed
- Make sure your internet connection is active

## Production Deployment

When deploying to production:

1. Add your production domain to:
   - Authorized JavaScript origins
   - Authorized redirect URIs
2. Update `.env` with production Client ID if different
3. Consider using environment-specific configurations

## Security Notes

- Never commit your `.env` file to version control
- Keep your Client ID secure
- Use HTTPS in production
- Regularly review authorized domains in Google Cloud Console

## Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [@react-oauth/google Documentation](https://www.npmjs.com/package/@react-oauth/google)
