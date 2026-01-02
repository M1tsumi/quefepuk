# quefep

Personal website built with Cloudflare Workers - fast, serverless, and deployed globally.

## Features

- 🎨 Clean, cream-colored design
- 🚀 Serverless architecture with Cloudflare Workers
- 📝 Blog system with syntax highlighting
- 📱 Fully responsive design
- ⚡ Zero cold starts, deployed globally
- 💰 Free tier friendly (100k requests/day)

## Tech Stack

- **Platform**: Cloudflare Workers
- **Languages**: HTML, CSS, JavaScript
- **Styling**: Custom CSS with CSS Grid & Flexbox
- **Code Highlighting**: Highlight.js

## Local Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Cloudflare account

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Update wrangler.toml**:
   - Add your `account_id` from your Cloudflare dashboard

4. **Run locally**:
   ```bash
   npm run dev
   ```
   
   Your site will be available at `http://localhost:8787`

## Deployment

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

Your site will be live at `https://quefep-website.your-subdomain.workers.dev`

### Custom Domain (Optional)

1. Add your domain to Cloudflare
2. Update `wrangler.toml` with your domain configuration:
   ```toml
   [[routes]]
   pattern = "yourdomain.com/*"
   zone_name = "yourdomain.com"
   ```
3. Deploy again: `npm run deploy`

## Project Structure

```
quefepuk/
├── local/                  # Local planning documents
│   └── plan.txt           # Project plan and notes
├── src/                   # Source files
│   ├── index.html         # Main landing page
│   ├── styles.css         # Global styles
│   ├── blog-list.html     # Blog listing page
│   ├── blog-post-template.html
│   └── blog-posts/        # Blog post data
│       └── *.json
├── worker.js              # Cloudflare Worker (main entry)
├── wrangler.toml          # Cloudflare Workers config
├── package.json           # Node dependencies
└── README.md              # This file
```

## Adding Blog Posts

### Method 1: Using KV Storage (Recommended for Production)

1. Create a KV namespace:
   ```bash
   npx wrangler kv:namespace create BLOG_POSTS
   ```

2. Add the namespace to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "BLOG_POSTS"
   id = "your-namespace-id"
   ```

3. Upload blog posts:
   ```bash
   npx wrangler kv:key put --binding=BLOG_POSTS "post-slug" "$(cat blog-post.json)"
   ```

### Method 2: Embedded in Worker (Simple)

Add posts to the `BLOG_POSTS` array in `worker.js` and include content inline.

## Blog Post Format

Create JSON files in `src/blog-posts/`:

```json
{
  "slug": "my-post-slug",
  "title": "My Post Title",
  "date": "January 2, 2026",
  "readTime": 5,
  "tags": ["tag1", "tag2"],
  "excerpt": "Brief description...",
  "content": "<h2>Heading</h2><p>Content with HTML...</p>"
}
```

## Commands

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run tail` - View live logs from deployed worker

## Free Tier Limits

Cloudflare Workers Free Tier includes:
- 100,000 requests per day
- 10ms CPU time per request
- 1 MB script size
- 10 GB KV storage (100,000 reads/day, 1,000 writes/day)

Perfect for personal websites and blogs!

## Social Links

- Discord: https://discord.gg/6nS2KqxQtj
- CurseForge: https://www.curseforge.com/members/quefep
- GitHub: https://github.com/M1tsumi
- X: https://x.com/thats_alot

## License

MIT License - See LICENSE file for details

---

Built with care by quefep 💜
