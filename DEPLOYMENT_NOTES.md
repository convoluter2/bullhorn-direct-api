# Deployment Notes

## 429 Error on Published App

If you encounter a **429 (Too Many Requests)** error when accessing the published Spark app, this is caused by GitHub's infrastructure rate limiting, not by the Bullhorn Data Manager code itself.

### Why This Happens

- GitHub Sparks have rate limits on initial access
- The published app URL may be cached or accessed frequently
- Network conditions can trigger rate limits

### Solutions

1. **Wait and Retry**
   - Wait 60 seconds and refresh the page
   - The rate limit typically resets quickly

2. **Clear Browser Cache**
   - Clear your browser cache for the Spark app URL
   - Try accessing in an incognito/private window

3. **Development Environment**
   - For development, run locally: `npm run dev`
   - The OAuth proxy requires local development: `npm run dev:proxy`
   - Local development doesn't have these rate limits

### OAuth Proxy in Production

**Important**: The OAuth proxy server is a localhost development tool and will NOT work in the published Spark environment. This is expected behavior.

- **In Development**: Proxy server enables automated OAuth
- **In Production**: Use manual OAuth authentication method instead

### Manual Authentication

When using the published app:

1. Click "Connect to Bullhorn"
2. Choose "Manual OAuth"
3. Click "Get Auth Code"
4. Copy the code from the URL
5. Paste it into the "Auth Code" field

This method works reliably without requiring the proxy server.

## Rate Limiting Features

The app includes sophisticated rate limiting for Bullhorn API calls:

- Respects API rate limit headers
- Automatic throttling when limits are approached
- Configurable calls per minute (default: 1500)
- Concurrent request management (up to 500)
- Automatic retry with exponential backoff on 429 errors

These features ensure the app works efficiently with Bullhorn's API without triggering their rate limits.

## Troubleshooting

If you continue to experience issues:

1. Check the browser console for specific error messages
2. Verify you're using a saved connection with correct credentials
3. Try manual OAuth authentication instead of automated
4. For persistent issues, run locally with `npm run dev`

## Support

For questions or issues, please contact the development team.
