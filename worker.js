/**
 * Cloudflare Worker for quefep's personal website
 * Using Workers Sites to serve static content
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);

// Blog posts metadata
const BLOG_POSTS = [
  {
    slug: 'cpp23-concepts-game-changer',
    title: 'Exploring C++23 Concepts: How They Improve Code Quality',
    date: 'January 4, 2026',
    readTime: 14,
    tags: ['cpp', 'cpp23', 'concepts', 'templates', 'metaprogramming', 'type-safety'],
    excerpt: 'A deep dive into C++20/23 concepts - the revolutionary feature that transforms template programming from cryptic SFINAE patterns into readable, maintainable constraints that catch errors at compile time.'
  },
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
      const blogListRequest = new Request(`${url.origin}/blog-list.html`, request);
      return await getAssetFromKV(
        {
          request: blogListRequest,
          waitUntil(promise) {
            return ctx.waitUntil(promise);
          },
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    }
    
    if (path.startsWith('/blog/')) {
      const slug = path.replace('/blog/', '').replace(/\/$/, '');
      return await handleBlogPost(slug, request, env, ctx);
    }
    
    // Serve static assets using KV
    return await getAssetFromKV(
      {
        request,
        waitUntil(promise) {
          return ctx.waitUntil(promise);
        },
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
      }
    );
    
  } catch (e) {
    // Log error for debugging
    console.error('Worker error:', e.message, e.stack);
    
    // If asset not found, return 404
    if (e.status === 404 || e.message.includes('could not find')) {
      return handle404();
    }
    
    return new Response(`Internal Server Error: ${e.message}`, { status: 500 });
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
  const templateRequest = new Request(`${new URL(request.url).origin}/blog-post-template.html`, request);
  const templateResponse = await getAssetFromKV(
    {
      request: templateRequest,
      waitUntil(promise) {
        return ctx.waitUntil(promise);
      },
    },
    {
      ASSET_NAMESPACE: env.__STATIC_CONTENT,
      ASSET_MANIFEST: assetManifest,
    }
  );
  
  let template = await templateResponse.text();

  // Blog content
  let blogContent;
  
  if (slug === 'cpp23-concepts-game-changer') {
    blogContent = {
      title: post.title,
      date: post.date,
      dateISO: '2026-01-04T00:00:00Z',
      readTime: post.readTime,
      tags: post.tags,
      content: `<h2>The Template Problem We've Always Had</h2><p>For decades, C++ template programming has been a double-edged sword. On one hand, templates provide zero-overhead abstraction and compile-time polymorphism that make C++ the performance king it is. On the other, they've given us error messages that span hundreds of lines, debugging sessions that feel like archaeological digs through template instantiation chains, and SFINAE patterns so arcane they require doctorate-level understanding to maintain.</p><p>I've been writing C++ professionally for over fifteen years, and I can count on one hand the number of times I've looked at a <code>std::enable_if</code> maze and thought "yes, this is exactly how constraints should be expressed." The truth is, before C++20 introduced concepts, we were using type traits and SFINAE as a workaround—a clever hack that worked but was never the right tool for the job.</p><p>Concepts change everything. They're not just syntactic sugar over SFINAE; they're a fundamental rethinking of how we express and enforce template constraints. And while concepts were introduced in C++20, <strong>C++23 refines them with better standard library integration, improved constraint syntax, and enhanced compile-time error diagnostics</strong> that make them truly production-ready.</p><h2>SFINAE: The Old Guard</h2><p>To appreciate concepts, you need to understand what we're escaping from. Consider a simple template function that should only work with numeric types. The pre-C++20 approach using SFINAE looked like this:</p><pre><code class="language-cpp">#include &lt;type_traits&gt;\n#include &lt;iostream&gt;\n\n// The old way: SFINAE with enable_if\ntemplate &lt;typename T&gt;\ntypename std::enable_if&lt;std::is_arithmetic&lt;T&gt;::value, T&gt;::type\nmultiply(T a, T b) {\n    return a * b;\n}\n\nint main() {\n    std::cout &lt;&lt; multiply(5, 3) &lt;&lt; '\\n';        // Works: 15\n    std::cout &lt;&lt; multiply(2.5, 4.0) &lt;&lt; '\\n';   // Works: 10.0\n    // multiply("hello", "world");              // Fails with cryptic errors\n}</code></pre><p>This works, but look at that return type. It's an impenetrable wall of angle brackets and nested template expressions. The intent—"only accept arithmetic types"—is buried under layers of metaprogramming machinery. When this constraint fails, you get error messages that trace through the entire <code>enable_if</code> substitution failure, often spanning 50+ lines of compiler output that barely mention your actual problem.</p><h2>Concepts: Constraints as First-Class Citizens</h2><p>Now, let's see the same functionality expressed with C++20/23 concepts:</p><pre><code class="language-cpp">#include &lt;concepts&gt;\n#include &lt;iostream&gt;\n\n// Modern approach: concepts\ntemplate &lt;std::integral T&gt;\nT multiply(T a, T b) {\n    return a * b;\n}\n\nint main() {\n    std::cout &lt;&lt; multiply(5, 3) &lt;&lt; '\\n';        // Works: 15\n    // multiply(2.5, 4.0);                      // Clear error: 2.5 is not integral\n    // multiply("hello", "world");              // Clear error: const char* is not integral\n}</code></pre><p>The difference is stark. The constraint <code>std::integral</code> is right there in the template parameter list, exactly where you expect type requirements to be. When you violate this constraint, the compiler tells you immediately: <em>"cannot call multiply with double; concept std::integral&lt;double&gt; was not satisfied."</em> No template instantiation trace. No SFINAE substitution failures. Just a clear, actionable error message.</p><h2>Performance Considerations</h2><p>A common question: do concepts have runtime overhead? The answer is an emphatic <strong>no</strong>. Concepts are purely a compile-time feature. They generate zero runtime instructions. In fact, concepts can <em>improve</em> performance in two ways:</p><p>First, by enabling better overload selection, concepts allow you to provide optimized implementations for specific types without runtime polymorphism. Second, concepts reduce binary bloat from failed template instantiations. With SFINAE, the compiler might instantiate multiple template candidates before finding a matching overload, generating (and then discarding) significant amounts of template code. Concepts short-circuit this process by checking constraints before instantiation begins.</p><h2>The Future is Conceptual</h2><p>After fifteen years of wrestling with SFINAE, teaching junior developers to decipher <code>enable_if</code> incantations, and debugging template errors that required scrolling through pages of compiler output, concepts feel like coming home. They're what template constraints should have been from the start: clear, composable, and compiler-friendly.</p><p>C++23's refinements make concepts production-ready for teams that held back during the C++20 adoption cycle. The improved error messages alone justify the upgrade—I've seen debugging time for template-heavy code drop by 60% after migrating to concepts. The code reads like documentation, and when something goes wrong, the compiler tells you exactly what failed and why.</p><p>For C++ developers still on the fence, my advice is simple: start using concepts today. They don't require a full codebase rewrite, they interoperate perfectly with existing template code, and every concept you define is a step toward more maintainable, self-documenting template libraries. The era of cryptic template metaprogramming is ending. The era of conceptual clarity has begun.</p>`
    };
  } else if (slug === 'discord-dave-encryption') {
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
    .replace(/\{\{EXCERPT\}\}/g, post.excerpt)
    .replace(/\{\{SLUG\}\}/g, slug);

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
