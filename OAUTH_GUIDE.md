# Bullhorn OAuth Authentication Guide

## Overview

This application implements the Bullhorn OAuth 2.0 authorization code flow with automatic token refresh to provide secure, persistent access to the Bullhorn REST API.

## Authentication URLs

- **OAuth Base URL**: `https://auth-east.bullhornstaffing.com/oauth`
- **ATS Cluster URL**: `https://cls43.bullhornstaffing.com`
- **REST Login URL**: `https://rest.bullhornstaffing.com/rest-services/login`

## OAuth Flow

### Method 1: Username & Password (Automatic)

This method handles the entire OAuth flow automatically:

1. User enters:
   - Client ID
   - Client Secret
   - Bullhorn Username
   - Bullhorn Password

2. Application automatically:
   - Requests authorization code from `/oauth/authorize`
   - Exchanges code for access token at `/oauth/token`
   - Uses access token to get REST session token via `/rest-services/login`
   - Stores refresh token for automatic renewal

### Method 2: Authorization Code (Manual)

This method is useful when the automatic flow doesn't work or for more control:

1. User enters Client ID and Client Secret

2. Application generates authorization URL:
   ```
   https://auth-east.bullhornstaffing.com/oauth/authorize?
     client_id={YOUR_CLIENT_ID}&
     response_type=code&
     redirect_uri={YOUR_REDIRECT_URI}&
     state={RANDOM_STATE}
   ```

3. User visits the URL and authorizes the application

4. Bullhorn redirects back with authorization code:
   ```
   {redirect_uri}?code={AUTHORIZATION_CODE}&state={STATE}
   ```

5. User copies the authorization code and pastes it into the app

6. Application exchanges code for tokens:
   ```
   POST https://auth-east.bullhornstaffing.com/oauth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=authorization_code&
   code={AUTH_CODE}&
   client_id={CLIENT_ID}&
   client_secret={CLIENT_SECRET}&
   redirect_uri={REDIRECT_URI}
   ```

7. Response contains:
   ```json
   {
     "access_token": "...",
     "refresh_token": "...",
     "expires_in": 600
   }
   ```

8. Application uses access token to get REST session token

## Token Refresh

Access tokens expire after 10 minutes (600 seconds). The application automatically refreshes them:

1. **Background Check**: Every 30 seconds, the app checks if the token expires in less than 60 seconds

2. **Automatic Refresh**: When needed, the app makes a refresh request:
   ```
   POST https://auth-east.bullhornstaffing.com/oauth/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=refresh_token&
   refresh_token={REFRESH_TOKEN}&
   client_id={CLIENT_ID}&
   client_secret={CLIENT_SECRET}
   ```

3. **New Tokens**: Response contains new access token and refresh token

4. **Session Update**: App gets new REST session token and updates stored session

5. **Logging**: Refresh events are logged in the audit trail

## Session Storage

The application stores the following in persistent storage:

- **Session Data** (key: `bullhorn-session`):
  - BhRestToken - The REST API session token
  - restUrl - The base URL for REST API calls
  - corporationId - Your Bullhorn corporation ID
  - userId - Your user ID
  - refreshToken - Token for automatic renewal
  - accessToken - Current OAuth access token
  - expiresAt - Timestamp when token expires

- **Credentials** (key: `bullhorn-credentials`):
  - clientId - Your OAuth client ID (needed for refresh)
  - clientSecret - Your OAuth client secret (needed for refresh)

## API Configuration

All API calls are configured to use the East data center:

- Authorization uses: `auth-east.bullhornstaffing.com`
- API calls use the REST URL from the login response (typically includes your cluster like `cls43`)

## Troubleshooting

### "No authorization code received"
- Verify your Client ID is correct
- Check that your credentials have API access permissions
- Try the manual authorization code method

### "Failed to exchange code for token"
- Verify your Client Secret is correct
- Ensure the authorization code hasn't expired (use it immediately)
- Check that redirect URIs match if specified

### "Failed to refresh access token"
- The app will prompt you to reconnect
- This can happen if the refresh token expires or is revoked
- Simply authenticate again

### "Session expired"
- If automatic refresh fails, you'll need to reconnect
- Check your network connection
- Verify your credentials are still valid

## Security Notes

- Client secrets are stored securely in browser storage
- Tokens are never exposed in logs or console output
- Sessions persist across page refreshes
- All API communication uses HTTPS
- Tokens are automatically refreshed before expiration
