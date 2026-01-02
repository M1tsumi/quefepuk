/**
 * Cloudflare Worker for quefep's personal website
 * Using Workers Sites to serve static content
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// Blog posts metadata
const BLOG_POSTS = [
  {
    slug: 'discord-dave-encryption',
    title: 'Decoding DAVE: Discord\'s End-to-End Encryption for Voice and Video',
    date: 'January 2, 2026',
    readTime: 12,
    tags: ['discord', 'encryption', 'privacy', 'e2ee', 'voice', 'video'],
    excerpt: 'Explore Discord\'s DAVE protocol - a deep dive into end-to-end encryption for voice and video calls, how it works, and what it means for developers and users.'
  }
];

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Handle blog routes dynamically
    if (path === '/blog' || path === '/blog/') {
      return getAssetFromKV({
        request,
        waitUntil(promise) { return ctx.waitUntil(promise); },
      }, {
        mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/blog-list.html`, req)
      });
    }
    
    if (path.startsWith('/blog/')) {
      const slug = path.replace('/blog/', '').replace(/\/$/, '');
      return handleBlogPost(slug, request, env, ctx);
    }
    
    // Serve static assets using KV
    return await getAssetFromKV({
      request,
      waitUntil(promise) { return ctx.waitUntil(promise); },
    });
    
  } catch (e) {
    // If asset not found, return 404
    if (e.status === 404 || e.message.includes('could not find')) {
      return handle404();
    }
    
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Serve individual blog post
 */
async function handleBlogPost(slug, request, env, ctx) {
  const post = BLOG_POSTS.find(p => p.slug === slug);
  
  if (!post) {
    return handle404();
  }

  // Get the blog post template
  const templateResponse = await getAssetFromKV({
    request,
    waitUntil(promise) { return ctx.waitUntil(promise); },
  }, {
    mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/blog-post-template.html`, req)
  });
  
  let template = await templateResponse.text();

  // Blog content
  let blogContent;
  
  if (slug === 'discord-dave-encryption') {
    blogContent = {
      title: post.title,
      date: post.date,
      dateISO: '2026-01-02T00:00:00Z',
      readTime: post.readTime,
      tags: post.tags,
      content: `<h2>What DAVE Is (and Is Not)</h2><p>DAVE is not a wholesale replacement for Discord's voice and video stack. Instead, it functions as a cryptographic layer integrated into the existing pipeline. The underlying technologies, like WebRTC for encoding, transport, and congestion control, continue to operate as before. Discord's Selective Forwarding Units (SFUs) also remain in place to efficiently route media packets between participants.</p><p>The crucial change is that DAVE encrypts the already-encoded media frames before they leave a user's device. This encryption is end-to-end, meaning only other participants in the call possess the keys to decrypt it. It is essential to note the scope of this protection: DAVE currently secures <strong>audio and video media only</strong>. Text-based communication—including direct messages and server channel chats—is not end-to-end encrypted and remains visible to Discord's servers for moderation and operational purposes.</p><h2>How DAVE Works: MLS and WebRTC Transforms</h2><p>DAVE's design cleverly combines two established technologies. For the complex task of managing encryption keys within a dynamic group, it uses the <strong>Messaging Layer Security (MLS)</strong> protocol. When a call begins or a participant joins, the clients perform an MLS handshake to establish a shared cryptographic state. Each time someone joins or leaves, the protocol advances to a new "epoch," which rotates the encryption material. This process provides critical security properties: forward secrecy, which prevents new members from decrypting past call data, and post-leave security, which ensures departed members cannot access future communications.</p><p>The actual encryption of audio and video is handled by the <strong>WebRTC Encoded Transform API</strong>. This browser standard allows Discord to insert an encryption step after a media frame is encoded by the codec but before it is packaged into network packets. Conversely, decryption happens immediately after packets are received and before the frame is decoded.</p><h2>Negotiating the Green Lock</h2><p>The appearance of the green lock icon is not automatic; it is the result of a capability negotiation. DAVE is only enabled for a call if <strong>every single participant's client supports it</strong>. The voice gateway checks for this by looking at a <code>max_dave_protocol_version</code> field advertised by each client and selects the lowest common version. If all clients announce support, the call negotiates E2EE and the lock appears.</p><h2>Transparency, Audits, and Intentional Limits</h2><p>Discord has approached DAVE with a commendable level of transparency. The company has published a <strong>protocol whitepaper</strong> detailing the cryptographic design, released the core <strong><code>libdave</code> library</strong> as open-source code, and commissioned independent <strong>third-party security audits</strong> from firms like Trail of Bits. These materials allow for public scrutiny and verification of the protocol's security claims.</p><h2>What This Means for Developers and Bots</h2><p>For developers interested in Discord's voice technology, DAVE introduces new constraints. Any tool or bot that previously relied on accessing audio packets from the voice gateway will fail to decode audio from a DAVE-protected call. To access the decrypted media, a client must fully implement the DAVE protocol stack: participate in the MLS group handshake, manage epoch changes, and perform the WebRTC encoded transforms.</p><h2>The Bottom Line</h2><p>DAVE successfully brings robust, standards-based end-to-end encryption to Discord's real-time audio and video calls. It is a meaningful privacy upgrade that protects the content of conversations from interception, including by Discord itself, without requiring an overhaul of the platform's proven media routing infrastructure. For developers and technically-inclined users, it is best understood as a carefully scoped <strong>cryptographic overlay</strong>.</p>`
    };
  }

  if (!blogContent) {
    return handle404();
  }

  // Generate tags HTML
  const tagsHTML = blogContent.tags 
    ? `<div class="blog-tags">${blogContent.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}</div>`
    : '';

  // Generate tags meta
  const tagsMeta = blogContent.tags ? blogContent.tags.join(', ') : '';

  // Replace template placeholders
  const html = template
    .replace(/\{\{TITLE\}\}/g, blogContent.title)
    .replace(/\{\{DATE\}\}/g, blogContent.date)
    .replace(/\{\{DATE_ISO\}\}/g, blogContent.dateISO || '2026-01-02T00:00:00Z')
    .replace(/\{\{READ_TIME\}\}/g, blogContent.readTime)
    .replace(/\{\{TAGS\}\}/g, tagsHTML)
    .replace(/\{\{TAGS_META\}\}/g, tagsMeta)
    .replace(/\{\{CONTENT\}\}/g, blogContent.content)
    .replace(/\{\{EXCERPT\}\}/g, post.excerpt);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

/**
 * Handle 404 errors
 */
function handle404() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>404 - Page Not Found</title>
      <link rel="stylesheet" href="/styles.css">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    </head>
    <body>
      <div class="container">
        <nav class="nav-header">
          <a href="/" class="nav-logo">quefep</a>
          <a href="/blog" class="nav-link">blog</a>
        </nav>
        <main class="main-content">
          <div style="text-align: center; padding: 4rem 0;">
            <h1 style="font-size: 4rem; margin-bottom: 1rem; color: var(--text-primary);">404</h1>
            <p style="font-size: 1.5rem; color: var(--text-secondary); margin-bottom: 2rem;">Page not found</p>
            <a href="/" style="color: var(--accent); text-decoration: none; font-weight: 500; padding: 0.75rem 1.5rem; border: 2px solid var(--accent); border-radius: var(--radius-md); display: inline-block; transition: var(--transition);">Go back home</a>
          </div>
        </main>
        <footer class="footer">
          <p>&copy; 2026 quefep. Built with care.</p>
        </footer>
      </div>
    </body>
    </html>
  `;

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
