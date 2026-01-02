# Deployment Guide

## Quick Deploy to Cloudflare Workers

This guide will get your website live on Cloudflare Workers in minutes.

### Prerequisites

- Node.js v20 or higher
- npm
- Free Cloudflare account at https://dash.cloudflare.com

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This opens your browser. Follow the prompts to authenticate with your Cloudflare account. Once authenticated, your account info is automatically saved.

### Step 3: Deploy Your Website

```bash
npm run deploy
```

That's it! Your website is now live. Look for output like:

```
✨ Successfully published your Worker to:
https://quefep-website.<random-hash>.workers.dev
```

Visit that URL to see your live website!

## View Live Logs

After deployment, you can view real-time logs:

```bash
npm run tail
```

## Update Your Website

After making changes locally:

1. Test with `npm run dev`
2. Commit changes: `git add . && git commit -m "message"`
3. Deploy: `npm run deploy`

## Custom Domain (Optional)

To use your own domain:

1. **Add domain to Cloudflare**: https://dash.cloudflare.com
2. **Update `wrangler.toml`**:
   ```toml
   [[routes]]
   pattern = "yourdomain.com/*"
   zone_name = "yourdomain.com"
   ```
3. **Redeploy**:
   ```bash
   npm run deploy
   ```

## Troubleshooting

### "Wrangler requires Node.js v20+"
Update Node.js:
```bash
# If using nvm
nvm install 20
nvm use 20
```

### "Not authenticated"
Rerun the login:
```bash
npx wrangler login
```

### Changes not showing after deploy
Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)

### Size limit exceeded
Keep bundle under 1MB. Remove unnecessary dependencies.

## Free Tier Limits

- **100,000 requests/day** ✓
- **10ms CPU time/request** ✓
- **1 MB script size** ✓ (your site is ~20KB)
- **1000 routes** ✓

Your current usage is well within limits!

## Need Help?

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/
- Discord Support: https://discord.gg/6nS2KqxQtj

---

Your website is now production-ready! 🚀
