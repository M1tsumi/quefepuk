# quefep - Personal Developer Portfolio & Technical Blog

> A modern, serverless personal website featuring technical blog posts about Discord's DAVE encryption protocol, Cloudflare Workers, and more. Built with Cloudflare Workers and deployed globally.

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Live Site](https://img.shields.io/badge/Live-quefepukbhu.pawsome2006.workers.dev-blue)](https://quefepukbhu.pawsome2006.workers.dev)

## 🌐 Live Website

Visit the live site: [quefepukbhu.pawsome2006.workers.dev](https://quefepukbhu.pawsome2006.workers.dev)

## ✨ Features

- 🎨 **Clean Design**: Cream-colored, professional interface with custom CSS
- 🚀 **Serverless Architecture**: Built on Cloudflare Workers for global edge deployment
- 📝 **Technical Blog**: In-depth articles about Discord encryption, serverless architecture, and more
- 🔐 **Featured Content**: Deep dive into Discord's DAVE (Discord's Audio & Video E2EE) protocol
- 💻 **Syntax Highlighting**: Beautiful code blocks with Highlight.js
- 📱 **Fully Responsive**: Mobile-first design that works on all devices
- ⚡ **Edge Performance**: Zero cold starts, sub-10ms response times worldwide
- 💰 **Cost Effective**: Runs on Cloudflare's generous free tier (100k requests/day)
- 🔍 **SEO Optimized**: Structured data, sitemaps, and comprehensive meta tags

## 📚 Blog Topics

- **Discord DAVE Protocol**: End-to-end encryption for voice and video calls
- **WebRTC**: Real-time communication and media encryption
- **Cloudflare Workers**: Serverless computing at the edge
- **Cryptography**: MLS (Messaging Layer Security) protocol deep dives
- **Minecraft Development**: CurseForge projects and modding

## 🛠 Tech Stack

- **Platform**: [Cloudflare Workers](https://workers.cloudflare.com/) (Serverless)
- **Storage**: Workers KV (for static assets)
- **Languages**: HTML5, CSS3, JavaScript (ES Modules)
- **Styling**: Custom CSS with CSS Grid, Flexbox, and CSS Variables
- **Code Highlighting**: [Highlight.js](https://highlightjs.org/)
- **Deployment**: Wrangler CLI
- **SEO**: Structured Data (JSON-LD), Open Graph, Twitter Cards

## 🚀 Local Development

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

## 📝 Commands

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare Workers
- `npm run tail` - View live logs from deployed worker

## 🔍 SEO Features

This site is optimized for search engines with:
- **Structured Data**: JSON-LD schema for Person, Blog, and BlogPosting
- **Meta Tags**: Comprehensive Open Graph and Twitter Card tags
- **Sitemap**: XML sitemap at `/sitemap.xml`
- **Robots.txt**: Search engine crawler configuration
- **Canonical URLs**: Proper canonical tags on all pages
- **Semantic HTML**: Proper heading hierarchy and ARIA labels

## 🌟 Featured Article

### Decoding DAVE: Discord's End-to-End Encryption for Voice and Video

An in-depth technical analysis of Discord's DAVE protocol, covering:
- How DAVE implements E2EE for real-time voice and video
- The MLS (Messaging Layer Security) protocol integration
- WebRTC Encoded Transform API usage
- Security properties: forward secrecy and post-leave security
- Implications for developers building Discord bots and tools

Read the full article: [Discord DAVE Encryption](https://quefepukbhu.pawsome2006.workers.dev/blog/discord-dave-encryption)

## 🔗 Connect

- **GitHub**: [@M1tsumi](https://github.com/M1tsumi)
- **Discord**: [6nS2KqxQtj](https://discord.com/invite/6nS2KqxQtj)
- **CurseForge**: [quefep](https://www.curseforge.com/members/quefep)
- **X (Twitter)**: [@thats_alot](https://x.com/thats_alot)

## 📊 Free Tier Limits

Cloudflare Workers Free Tier includes:
- 100,000 requests per day
- 10ms CPU time per request
- Workers KV: 100,000 reads/day, 1,000 writes/day

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- Syntax highlighting by [Highlight.js](https://highlightjs.org/)
- Fonts from [Google Fonts](https://fonts.google.com/)

---

**Keywords**: Discord DAVE encryption, end-to-end encryption, E2EE, WebRTC, MLS protocol, Cloudflare Workers, serverless blog, technical writing, Discord voice encryption, Minecraft development, CurseForge, quefep, M1tsumi
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
