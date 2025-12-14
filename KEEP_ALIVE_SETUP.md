# Keep-Alive Setup Guide

This setup prevents your Supabase project from auto-pausing by pinging it daily via GitHub Actions.

## Security Features

✅ **Secret Token Authentication** - Only requests with the correct token can access the endpoint  
✅ **Rate Limiting** - Prevents abuse (max 10 requests per minute per IP)  
✅ **Minimal Resource Usage** - Makes a lightweight query that doesn't access real data  
✅ **No Sensitive Data** - Endpoint doesn't expose any application data  

## Setup Instructions

### 1. Generate a Secret Token

Generate a strong, random token (at least 32 characters):

```bash
# Using OpenSSL
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Set Environment Variables

Add the following environment variable to your deployment platform (Vercel, etc.):

- **Variable Name:** `KEEP_ALIVE_SECRET_TOKEN`
- **Value:** The secret token you generated in step 1

### 3. Configure GitHub Actions Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

   - **`KEEP_ALIVE_SECRET_TOKEN`**: The same secret token from step 1
   - **`KEEP_ALIVE_ENDPOINT_URL`**: Your production URL + `/api/keep-alive`
     - Example: `https://your-domain.com/api/keep-alive`

### 4. Deploy Your Application

Deploy your application with the `KEEP_ALIVE_SECRET_TOKEN` environment variable set.

### 5. Test the Endpoint

Test the endpoint manually:

```bash
# Using curl
curl -X GET \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN" \
  https://your-domain.com/api/keep-alive

# Or with query parameter
curl -X GET \
  "https://your-domain.com/api/keep-alive?token=YOUR_SECRET_TOKEN"
```

You should receive a response like:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Keep-alive ping successful"
}
```

### 6. Test GitHub Actions Workflow

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Find the "Keep Supabase Alive" workflow
4. Click **Run workflow** to test it manually
5. Verify it completes successfully

## How It Works

1. **GitHub Actions** runs a scheduled cron job once daily (2 AM UTC by default)
2. The workflow makes an authenticated request to your `/api/keep-alive` endpoint
3. The endpoint verifies the secret token and makes a minimal Supabase query
4. This keeps your Supabase project active and prevents auto-pause

## Customization

### Change Schedule

Edit `.github/workflows/keep-alive.yml` and modify the cron schedule:

```yaml
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC daily
```

Cron format: `minute hour day month weekday`

Examples:
- `'0 2 * * *'` - 2 AM UTC daily
- `'0 */6 * * *'` - Every 6 hours
- `'0 0 * * 0'` - Every Sunday at midnight UTC

### Adjust Rate Limiting

Edit `app/api/keep-alive/route.ts`:

```typescript
const RATE_LIMIT_WINDOW = 60 * 1000; // Time window in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10; // Max requests per window
```

## Troubleshooting

### Endpoint returns 401 Unauthorized
- Verify `KEEP_ALIVE_SECRET_TOKEN` is set in your deployment environment
- Ensure the token in GitHub Actions secrets matches the deployment token

### Endpoint returns 429 Too Many Requests
- You've exceeded the rate limit (10 requests per minute)
- Wait a minute and try again
- If this happens frequently, consider increasing `MAX_REQUESTS_PER_WINDOW`

### GitHub Actions workflow fails
- Check that both secrets are set in GitHub repository settings
- Verify the endpoint URL is correct and accessible
- Check GitHub Actions logs for detailed error messages

### Supabase still auto-pauses
- Ensure the GitHub Actions workflow is running successfully
- Verify the endpoint is making successful requests (check logs)
- Consider running the workflow more frequently (e.g., every 6 hours)

## Security Notes

- **Never commit** the secret token to your repository
- Use different tokens for different environments (dev/staging/prod)
- Rotate the token periodically for better security
- The endpoint is rate-limited to prevent abuse, but it's still a public endpoint
- Consider adding IP allowlisting if you want additional security (though GitHub Actions IPs change frequently)
