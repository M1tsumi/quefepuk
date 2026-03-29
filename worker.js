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
    slug: 'pawsharp-dotnet-discord-wrapper',
    title: 'PawSharp: A Fresh, Modular .NET 8 Discord API Wrapper for Modern Bot Development',
    date: 'March 8, 2026',
    readTime: 16,
    tags: ['dotnet', 'dotnet8', 'discord-bot', 'csharp', 'nuget', 'api-wrapper', 'gateway', 'e2ee'],
    excerpt: 'Modular .NET 8 Discord API wrapper with REST, Gateway, voice, and native DAVE E2EE. Opt-in NuGet packages and strong typing for modern C# bot development.'
  },
  {
    slug: 'cpp26-reflection',
    title: 'C++26 Reflection: A Practical Guide to Compile-Time Introspection',
    date: 'January 6, 2026',
    readTime: 12,
    tags: ['cpp', 'cpp26', 'reflection', 'metaprogramming', 'compile-time'],
    excerpt: 'Compile-time reflection is coming to C++ with C++26. Learn how to use the new reflection operators to introspect types, iterate over class members, and write cleaner metaprogramming code—all with zero runtime overhead.'
  },
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

    // Handle docs routes
    if (path === '/docs' || path === '/docs/') {
      const docsListRequest = new Request(`${url.origin}/docs-list.html`, request);
      return await getAssetFromKV(
        {
          request: docsListRequest,
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

    if (path.startsWith('/docs/')) {
      const slug = path.replace('/docs/', '').replace(/\/$/, '');
      return await handleDocsPage(slug, request, env, ctx);
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

    // If ?debug=1 is present, return a safe debug page with the error message and limited manifest info
    try {
      const dbg = new URL(request.url).searchParams.get('debug');
      if (dbg === '1') {
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        let manifestKeys = [];
        try { manifestKeys = assetManifest ? Object.keys(assetManifest).slice(0, 200) : []; } catch (merr) { manifestKeys = ['<manifest-error>']; }
        const body = `<!doctype html><html><head><meta charset="utf-8"><title>Worker Debug</title></head><body style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;padding:20px;color:#222"><h1>Worker Debug Output</h1><h2>Message</h2><pre>${esc(e.message)}</pre><h2>Stack</h2><pre>${esc(e.stack || '')}</pre><h2>Asset manifest keys (first 200)</h2><pre>${esc(JSON.stringify(manifestKeys,null,2))}</pre></body></html>`;
        return new Response(body, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    } catch (dbgErr) {
      console.error('Debug render failed', dbgErr && (dbgErr.message || dbgErr));
    }

    // If asset not found, return 404
    if (e.status === 404 || (e.message && e.message.toLowerCase().includes('could not find'))) {
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
  
  if (slug === 'cpp26-reflection') {
    blogContent = {
      title: post.title,
      date: post.date,
      dateISO: '2026-01-06T00:00:00Z',
      readTime: post.readTime,
      tags: post.tags,
      content: `<h2>What Is Reflection?</h2><p>Reflection lets your code examine its own structure at compile time. You can query type information, iterate over class members, and generate code based on what you discover—all without complex template metaprogramming patterns.</p><p>The proposal was voted into C++26 in June 2025. While the standard won't be finalized until later this year, experimental implementations are already available for testing.</p><h2>The Core Concepts</h2><p>C++26 reflection introduces two operators and a type that let you work with metadata.</p><h3>The Reflection Operator (<code>^</code>)</h3><p>The reflection operator captures metadata about a program element:</p><pre><code class="language-cpp">#include &lt;experimental/meta&gt;\n\nint main() {\n    constexpr auto type_info = ^int;  // Reflect the type 'int'\n    constexpr auto var_info = ^std::vector;  // Reflect a template\n}</code></pre><h3>The Splice Operator (<code>[: :]</code>)</h3><p>The splice operator converts reflection values back into code:</p><pre><code class="language-cpp">constexpr auto r = ^int;\ntypename[:r:] x = 42;  // Same as: int x = 42;\n\ntypename[:^char:] c = '*';  // Same as: char c = '*';</code></pre><h3>The <code>std::meta::info</code> Type</h3><p>All reflection values have type <code>std::meta::info</code>. This opaque design allows future extensions without breaking existing code. You'll typically pass these values to metafunctions rather than work with them directly.</p><h2>Practical Examples</h2><h3>Enum to String Conversion</h3><p>Automatic enum-to-string conversion is straightforward with reflection:</p><pre><code class="language-cpp">#include &lt;experimental/meta&gt;\n#include &lt;string&gt;\n#include &lt;optional&gt;\n\ntemplate &lt;typename E&gt;\nrequires std::is_enum_v&lt;E&gt;\nconstexpr std::string enum_to_string(E value) {\n    template for (constexpr auto e : std::meta::enumerators_of(^E)) {\n        if (value == [:e:]) {\n            return std::string(std::meta::identifier_of(e));\n        }\n    }\n    return "&lt;unnamed&gt;";\n}\n\nenum class Color { Red, Green, Blue };\n\nint main() {\n    static_assert(enum_to_string(Color::Red) == "Red");\n    static_assert(enum_to_string(Color::Green) == "Green");\n}</code></pre><p>The <code>std::meta::enumerators_of</code> function returns all enumerators at compile time. We iterate with a <code>template for</code> loop (new in C++26), comparing values and extracting names with <code>std::meta::identifier_of</code>.</p><h3>Struct Introspection</h3><p>Iterating over struct members:</p><pre><code class="language-cpp">#include &lt;experimental/meta&gt;\n#include &lt;iostream&gt;\n#include &lt;array&gt;\n\nstruct Person {\n    int age;\n    std::string name;\n    double height;\n};\n\ntemplate &lt;typename T&gt;\nconsteval auto get_member_names() {\n    constexpr auto members = std::meta::nonstatic_data_members_of(^T);\n    std::array&lt;std::string_view, members.size()&gt; names;\n    \n    for (size_t i = 0; i &lt; members.size(); ++i) {\n        names[i] = std::meta::identifier_of(members[i]);\n    }\n    \n    return names;\n}\n\nint main() {\n    constexpr auto names = get_member_names&lt;Person&gt;();\n    \n    for (const auto&amp; name : names) {\n        std::cout &lt;&lt; name &lt;&lt; '\\n';\n    }\n    // Output: age, name, height\n}</code></pre><h3>Generating SQL Queries</h3><p>Generating SQL INSERT statements from C++ structs:</p><pre><code class="language-cpp">#include &lt;experimental/meta&gt;\n#include &lt;string&gt;\n#include &lt;sstream&gt;\n\ntemplate &lt;typename T&gt;\nstd::string generate_insert_columns() {\n    std::ostringstream oss;\n    constexpr auto members = std::meta::nonstatic_data_members_of(^T);\n    \n    bool first = true;\n    template for (constexpr auto member : members) {\n        if (std::meta::is_public(member)) {\n            if (!first) oss &lt;&lt; ", ";\n            oss &lt;&lt; std::meta::identifier_of(member);\n            first = false;\n        }\n    }\n    \n    return oss.str();\n}\n\nstruct User {\n    int id;\n    std::string name;\n    double balance;\nprivate:\n    int secret;  // This will be excluded\n};\n\nint main() {\n    std::string columns = generate_insert_columns&lt;User&gt;();\n    std::cout &lt;&lt; "INSERT INTO users (" &lt;&lt; columns &lt;&lt; ") VALUES (?, ?, ?)\\n";\n    // Output: INSERT INTO users (id, name, balance) VALUES (?, ?, ?)\n}</code></pre><p>The <code>std::meta::is_public(member)</code> check automatically excludes private members—something that previously required boilerplate or external tools.</p><h3>Member Layout and Offsets</h3><p>Reflection provides access to low-level details like member offsets and sizes—useful for serialization, memory mapping, and FFI:</p><pre><code class="language-cpp">#include &lt;experimental/meta&gt;\n#include &lt;array&gt;\n\nstruct member_descriptor {\n    std::size_t offset;\n    std::size_t size;\n};\n\ntemplate &lt;typename S&gt;\nconsteval auto get_layout() {\n    constexpr auto members = std::meta::nonstatic_data_members_of(^S);\n    std::array&lt;member_descriptor, members.size()&gt; layout;\n    \n    for (size_t i = 0; i &lt; members.size(); ++i) {\n        layout[i] = {\n            .offset = std::meta::offset_of(members[i]),\n            .size = std::meta::size_of(members[i])\n        };\n    }\n    \n    return layout;\n}\n\nstruct DataPacket {\n    char header;\n    int payload;\n    double timestamp;\n};\n\nint main() {\n    constexpr auto layout = get_layout&lt;DataPacket&gt;();\n    \n    for (size_t i = 0; i &lt; layout.size(); ++i) {\n        std::cout &lt;&lt; "Member " &lt;&lt; i \n                  &lt;&lt; ": offset=" &lt;&lt; layout[i].offset \n                  &lt;&lt; ", size=" &lt;&lt; layout[i].size &lt;&lt; '\\n';\n    }\n}</code></pre><p>This layout information is computed at compile time, enabling zero-overhead abstractions for binary protocols and serialization.</p><h2>Key Metafunctions</h2><p>The reflection API provides metafunctions for querying and manipulating type information:</p><p><strong>Type and Member Queries:</strong></p><ul><li><code>std::meta::nonstatic_data_members_of(type)</code> — returns all non-static data members</li><li><code>std::meta::enumerators_of(enum_type)</code> — returns all enumerators</li><li><code>std::meta::members_of(type)</code> — returns all members including functions</li><li><code>std::meta::bases_of(type)</code> — returns base classes</li></ul><p><strong>Information Extraction:</strong></p><ul><li><code>std::meta::identifier_of(reflection)</code> — gets the name as a string</li><li><code>std::meta::type_of(reflection)</code> — gets the type of a member</li><li><code>std::meta::offset_of(member)</code> — gets byte offset</li><li><code>std::meta::size_of(reflection)</code> — gets size in bytes</li></ul><p><strong>Type Testing:</strong></p><ul><li><code>std::meta::is_public(reflection)</code> — checks public access</li><li><code>std::meta::is_protected(reflection)</code> — checks protected access</li><li><code>std::meta::is_private(reflection)</code> — checks private access</li><li><code>std::meta::test_type&lt;Trait&gt;(type)</code> — applies type traits</li></ul><p>All functions are <code>consteval</code>, executing entirely at compile time with zero runtime overhead.</p><h2>Reflection vs. Template Metaprogramming</h2><p>Compare approaches for checking if a class has a specific member function:</p><p><strong>Traditional Template Metaprogramming:</strong></p><pre><code class="language-cpp">template &lt;typename T, typename = void&gt;\nstruct has_serialize : std::false_type {};\n\ntemplate &lt;typename T&gt;\nstruct has_serialize&lt;T, std::void_t&lt;\n    decltype(std::declval&lt;T&gt;().serialize())\n&gt;&gt; : std::true_type {};</code></pre><p><strong>With C++26 Reflection:</strong></p><pre><code class="language-cpp">template &lt;typename T&gt;\nconsteval bool has_serialize() {\n    for (auto member : std::meta::members_of(^T)) {\n        if (std::meta::identifier_of(member) == "serialize") {\n            return true;\n        }\n    }\n    return false;\n}</code></pre><p>The reflection version reads like procedural code. No SFINAE, no <code>void_t</code>, no template arcana. Error messages are comprehensible when things go wrong.</p><h2>Performance</h2><p>Reflection is a zero-overhead abstraction. All operations happen at compile time through <code>consteval</code> functions. By runtime, the compiler has generated optimized code based on the introspection—identical to hand-written alternatives.</p><p>Experimental implementations on Compiler Explorer verify that reflection-based code compiles to the same machine code as manual implementations.</p><h2>Trying Reflection Today</h2><p>Experimental implementations are available now:</p><p><strong>Bloomberg's Clang Fork:</strong> Available on <a href="https://github.com/bloomberg/clang-p2996">GitHub</a> and Compiler Explorer. The most complete implementation supporting most P2996 features.</p><p><strong>EDG Compiler:</strong> Also available on Compiler Explorer.</p><p>To use these, enable experimental flags and include <code>&lt;experimental/meta&gt;</code>:</p><pre><code class="language-cpp">// Compile with: clang++ -std=c++2c -freflection-latest\n#include &lt;experimental/meta&gt;</code></pre><h2>Current Limitations</h2><p>P2996 is the <em>initial</em> reflection facility. Some features aren't included in C++26:</p><p><strong>Code Injection:</strong> You can introspect existing code, but generating new functions or classes requires additional proposals (like P2237, possibly in C++29).</p><p><strong>String-Based Lookup:</strong> You can't look up members by string variable. Names come from reflection queries.</p><p><strong>Runtime Reflection:</strong> Everything happens at compile time. Runtime type information beyond RTTI must be built using compile-time reflection.</p><p>These represent careful design choices to deliver an implementable feature set while leaving room for future enhancements.</p><h2>Applications</h2><p>Reflection enables:</p><p><strong>Serialization:</strong> Convert objects to JSON, XML, or binary formats without macros or code generation.</p><p><strong>ORM Systems:</strong> Map C++ structs to database tables with minimal boilerplate.</p><p><strong>Command-Line Parsers:</strong> Generate argument parsers from struct definitions.</p><p><strong>Debug Logging:</strong> Create comprehensive output with member names and values.</p><p><strong>Unit Testing:</strong> Generate test fixtures and comparison operators.</p><p><strong>Network Protocols:</strong> Define message structures once and handle serialization automatically.</p><h2>Looking Ahead</h2><p>Reflection in C++26 is the foundation. Future standards will build on it with token injection, enhanced code generation, and expanded introspection.</p><p>The proposal establishes a solid core that can be extended incrementally in future C++ releases.</p><h2>Conclusion</h2><p>C++26 reflection provides compile-time introspection through intuitive operators and a clean API. It makes metaprogramming techniques more accessible while maintaining zero-overhead abstractions.</p><p>Whether building serialization libraries, code generation tools, or cleaner type-handling code, reflection changes how you approach C++ metaprogramming. Experimental implementations are available now—start experimenting to be ready when C++26 arrives.</p>`
    };
  } else if (slug === 'cpp23-concepts-game-changer') {
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
  } else if (slug === 'pawsharp-dotnet-discord-wrapper') {
    blogContent = {
      title: post.title,
      date: post.date,
      dateISO: '2026-03-08T00:00:00Z',
      readTime: post.readTime,
      tags: post.tags,
      content: `<h2>Introduction</h2><p>Building Discord bots in .NET has traditionally meant choosing from a small set of long-standing libraries. Many of these started years ago and have grown into complex frameworks with layers of abstractions, backward compatibility constraints, and design decisions that made perfect sense back then but feel cumbersome today.</p><p>PawSharp takes a clean-sheet approach. Designed specifically for .NET 8, it's a modular, fully opt-in Discord API wrapper that covers the entire API surface—REST, Gateway, voice, interactions—while letting you include only the pieces your project actually needs. Whether you're throwing together a quick personal bot or engineering a sharded, high-throughput production system, PawSharp puts control back in your hands without unnecessary baggage.</p><p>As of early 2026, PawSharp sits at version 0.10.0-alpha.3, targeting Discord API v10. The public surface is still evolving (as alphas do), but the core architecture has proven stable enough for real-world bots. Developers are already using it in production-like settings, and the pace of iteration is brisk.</p><h2>What Exactly Is PawSharp?</h2><p>At its heart, PawSharp is a set of NuGet packages that provide a clean, strongly-typed interface to the Discord API. It handles:</p><ul><li>WebSocket Gateway management—authentication, heartbeats, resuming sessions, sharding, and event dispatching</li><li>Roughly 140 REST endpoints covering messages and channels through to guilds, AutoMod rules, polls, and stage instances</li><li>An automatic in-memory entity cache kept fresh via gateway events</li><li>Per-route rate-limit bucket tracking with built-in 429 retry logic</li><li>Slash commands, message components (buttons, menus), and modals through a dedicated interaction router</li><li>Traditional prefix-based text commands via attributes and modules</li><li>Voice connections, including a full from-scratch implementation of Discord's DAVE end-to-end encryption (based on RFC 9420 MLS) using only .NET 8's native cryptography APIs—no external dependencies</li></ul><p>The real win is the modular packaging. You install exactly what you need:</p><pre><code class="language-bash"># Full-featured client (recommended for most bots)\ndotnet add package PawSharp.Client\n\n# Or pick and choose\ndotnet add package PawSharp.API          # REST only\ndotnet add package PawSharp.Gateway      # Gateway + events\ndotnet add package PawSharp.Commands     # Prefix commands\ndotnet add package PawSharp.Interactions # Slash commands &amp; components\ndotnet add package PawSharp.Interactivity# Reactions, polls, pagination helpers\ndotnet add package PawSharp.Voice        # Voice + DAVE encryption</code></pre><p>This keeps your dependency graph lean and your build artifacts small.</p><h2>Getting Started: Hello World in ~40 Lines</h2><p>PawSharp's fluent builder makes bootstrapping painless—no heavy DI setup required if you don't want it:</p><pre><code class="language-csharp">var client = new PawSharpClientBuilder()\n    .WithToken("YOUR_BOT_TOKEN_HERE")\n    .WithIntents(GatewayIntents.AllNonPrivileged | GatewayIntents.MessageContent)\n    .WithPresence("Just getting started", status: "online")\n    .UseConsoleLogging()\n    .Build();\n\nclient.OnMessageCreated(async msg =&gt;\n{\n    if (msg.Author?.IsBot == true) return;\n    if (msg.Content?.Trim().ToLower() == "!ping")\n    {\n        await client.Rest.CreateMessageAsync(msg.ChannelId, new() { Content = "Pong!" });\n    }\n});\n\nawait client.ConnectAsync();\nawait Task.Delay(Timeout.Infinite);</code></pre><p>That's genuinely all it takes. The builder assembles the REST client, gateway listener, cache, and interaction handler under a single <code>DiscordClient</code> object. No manual WebSocket plumbing, no heartbeat timers to manage.</p><h2>Core Features at a Glance</h2><h3>REST API: Comprehensive and Strongly Typed</h3><p>The <code>PawSharp.API</code> package gives you <code>IDiscordRestClient</code> with fully typed models for nearly the entire v10 REST surface. Key areas include messages (create/edit/delete/react/bulk), channels (CRUD + overwrites/invites/pins), guilds (members/roles/emojis/stickers/events), threads, webhooks, AutoMod rules, polls, and stage instances.</p><p>Enums replace magic numbers everywhere—<code>AutoModerationTriggerType</code>, <code>StageInstancePrivacyLevel</code>, and so on—so the compiler catches typos early.</p><h3>Rate Limiting: Hands-Off and Reliable</h3><p>Rate limits are handled transparently by <code>AdvancedRateLimiter</code>. It tracks per-route buckets, respects the global cap, and retries 429s automatically. You write normal code:</p><pre><code class="language-csharp">await client.Rest.CreateMessageAsync(channelId, new() { Content = "Sending this safely" });</code></pre><p>Only if retries are exhausted do you get a <code>RateLimitException</code>.</p><h3>Gateway: Full Coverage with Auto-Reconnect</h3><p><code>PawSharp.Gateway</code> owns the WebSocket lifecycle: IDENTIFY/RESUME, heartbeats (with <code>LastHeartbeatLatency</code> tracking), sharding via <code>ShardManager</code>, and over 40 event types dispatched cleanly.</p><p>Convenience events make subscription easy:</p><pre><code class="language-csharp">client.OnGuildMemberAdded(async member =&gt;\n{\n    await client.Rest.CreateMessageAsync(welcomeChannelId, new()\n    {\n        Content = $"Welcome aboard, &lt;@{member.User?.Id}&gt;!"\n    });\n});</code></pre><p>Recent additions in 0.10.0-alpha.3 include voice state updates, audit logs, scheduled event RSVPs, and more.</p><h3>Caching: Simple and Extensible</h3><p>Entities—guilds, channels, members, and more—are cached automatically via gateway events. Fetch them sync or async:</p><pre><code class="language-csharp">var guild = await client.Cache.GetGuildAsync(guildId);</code></pre><p>Out-of-the-box providers include a zero-overhead <code>MemoryCacheProvider</code> and an async <code>RedisCacheProvider</code> (already implemented and tested in the repo, though not yet published as a separate NuGet package).</p><h3>Interactions: Modern Components Done Right</h3><p>Slash commands, buttons, select menus, and modals are routed automatically:</p><pre><code class="language-csharp">client.Interactions.RegisterCommand("greet", async interaction =&gt;\n{\n    var name = interaction.GetOptionValue&lt;string&gt;("name") ?? "world";\n    await client.Interactions.RespondAsync(interaction.Id, interaction.Token,\n        new InteractionResponseBuilder()\n            .WithContent($"Hello, {name}!")\n            .AsEphemeral()\n            .Build());\n});</code></pre><p>Fluent builders enforce Discord constraints at compile time where possible—for example, a maximum of 5 components per action row.</p><h3>Prefix Commands: Familiar and Flexible</h3><p>Classic <code>!command</code> style uses attributes:</p><pre><code class="language-csharp">var commands = client.UseCommands("!");\n\npublic class FunCommands : BaseCommandModule\n{\n    [Command("ping")]\n    public async Task Ping(CommandContext ctx)\n        =&gt; await ctx.RespondAsync("Pong!");\n}\n\ncommands.RegisterModule(new FunCommands());</code></pre><p>Exceptions bubble up via <code>CommandErrored</code> for clean handling.</p><h3>Voice + Native DAVE Encryption</h3><p>Voice connections are straightforward, but the standout feature is the built-in DAVE (MLS-based E2EE) implementation—entirely in .NET 8 cryptography primitives (X25519, Ed25519, HPKE, and so on), with zero external crypto libraries.</p><pre><code class="language-csharp">var voice = client.UseVoice();\nvar conn = await voice.ConnectAsync(voiceChannelId);\nawait conn.PlayAudioAsync(rawOpusData);  // Opus encode/decode pipeline is in progress\nawait conn.DisconnectAsync();</code></pre><p><strong>Note:</strong> Opus codec encode/decode is not yet implemented—voice works for connection and handshake but not audio send/receive.</p><h3>Dependency Injection Support</h3><p>Everything is interface-based and DI-friendly:</p><pre><code class="language-csharp">services.AddPawSharpWithMemoryCache(options =&gt;\n{\n    options.Token = Environment.GetEnvironmentVariable("DISCORD_TOKEN")!;\n});</code></pre><h2>Structured Error Handling</h2><p>PawSharp avoids generic exceptions. The three you'll encounter are:</p><ul><li><code>ValidationException</code> — caught before the request leaves your code</li><li><code>RateLimitException</code> — thrown after retries are exhausted</li><li><code>DiscordApiException</code> — carries Discord's specific error code and message</li></ul><pre><code class="language-csharp">try\n{\n    await client.Rest.CreateMessageAsync(...);\n}\ncatch (DiscordApiException ex)\n{\n    // Handle known Discord error codes, e.g., 50035\n}</code></pre><h2>Current Limitations (Alpha Transparency)</h2><p>PawSharp is alpha software. Expect breaking changes before 1.0. Known gaps include:</p><ul><li>Opus audio codec (send/receive not yet wired up)</li><li>Automatic command module discovery via reflection</li><li>Attribute-based slash command bulk registration</li><li>Published Redis cache package</li></ul><p>The CHANGELOG tracks changes closely—read it before upgrading.</p><h2>Why Consider PawSharp?</h2><p>Compared to established options like Discord.Net or DSharpPlus:</p><ul><li><strong>Truly modular packages</strong> — smaller dependencies, cleaner builds</li><li><strong>Native .NET 8 design</strong> — modern idioms, no legacy cruft</li><li><strong>Unique native DAVE E2EE</strong> — meaningful for privacy-sensitive voice use cases</li><li><strong>Strong typing + fluent validation</strong> — fewer runtime surprises</li><li><strong>Transparent rate limiting + DI-first</strong> — fits cleanly into ASP.NET Core or generic hosts</li></ul><p>Trade-offs exist: a smaller community, a less battle-tested ecosystem, and an API that is still evolving. If your bot needs music playback right now, wait for Opus completion. For everything else—especially new projects in 2026—PawSharp feels refreshingly contemporary.</p><h2>Project Structure (For Curious Contributors)</h2><pre><code class="language-text">src/\n  PawSharp.Core          entities, enums, builders, exceptions\n  PawSharp.API           REST + rate limiter\n  PawSharp.Gateway       WebSocket + sharding\n  PawSharp.Cache         cache providers\n  PawSharp.Client        unified DiscordClient\n  PawSharp.Commands      prefix command system\n  PawSharp.Interactions  slash + components\n  PawSharp.Interactivity helpers (reactions, polls...)\n  PawSharp.Voice         voice + DAVE\ntests/                   80+ unit/integration tests\nexamples/                sample bots\ndocs/                    developer guides</code></pre><p>MIT licensed, with contributing guidelines and a code of conduct in the repository root.</p><h2>Wrapping Up</h2><p>PawSharp delivers a surprisingly complete Discord API experience in a lightweight, modern .NET 8 package. Its modular design, strong typing, native DAVE implementation, and transparent internals make it a compelling choice for developers who want to escape legacy abstractions.</p><p>Give it a try on your next bot project.</p><ul><li><strong>GitHub:</strong> <a href="https://github.com/M1tsumi/PawSharp" target="_blank" rel="noopener noreferrer">https://github.com/M1tsumi/PawSharp</a></li><li><strong>NuGet:</strong> <code>dotnet add package PawSharp.Client</code></li><li><strong>Docs:</strong> Start with <code>DEVELOPERS_GUIDE.md</code> in the repo's <code>/docs</code> folder</li><li><strong>License:</strong> MIT</li></ul>`
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
 * Serve an individual docs page
 */
async function handleDocsPage(slug, request, env, ctx) {
  // Fetch the doc JSON from KV
  let docData;
  try {
    const jsonRequest = new Request(`${new URL(request.url).origin}/docs/${slug}.json`, request);
    const jsonResponse = await getAssetFromKV(
      {
        request: jsonRequest,
        waitUntil(promise) { return ctx.waitUntil(promise); },
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
      }
    );
    docData = await jsonResponse.json();
  } catch (err) {
    // If the JSON doc is missing, attempt to serve a static HTML fallback
    try {
      const htmlRequest = new Request(`${new URL(request.url).origin}/docs/${slug}.html`, request);
      const htmlResponse = await getAssetFromKV(
        {
          request: htmlRequest,
          waitUntil(promise) { return ctx.waitUntil(promise); },
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
      return htmlResponse;
    } catch {
      return handle404();
    }
  }

  // Fetch the docs page template from KV
  const templateRequest = new Request(`${new URL(request.url).origin}/docs-page-template.html`, request);
  const templateResponse = await getAssetFromKV(
    {
      request: templateRequest,
      waitUntil(promise) { return ctx.waitUntil(promise); },
    },
    {
      ASSET_NAMESPACE: env.__STATIC_CONTENT,
      ASSET_MANIFEST: assetManifest,
    }
  );
  let template = await templateResponse.text();

  // Build sidebar nav HTML
  const sidebarNav = (docData.sections || [])
    .map(s => `<li><a href="#${s.id}" class="docs-sidebar-link">${s.title}</a></li>`)
    .join('\n');

  // Build main content HTML
  const content = (docData.sections || [])
    .map(s => `
      <section class="docs-section" id="${s.id}">
        <h2 class="docs-section-heading">${s.title}</h2>
        ${s.content}
      </section>`)
    .join('\n');

  // Tags HTML
  const tagsHTML = (docData.tags || [])
    .map(t => `<span class="docs-badge">${t}</span>`)
    .join('');

  // GitHub link HTML
  const githubLinkHTML = docData.github
    ? `<a href="${docData.github}" target="_blank" rel="noopener noreferrer" class="docs-github-link">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
        View on GitHub
      </a>`
    : '';

  const html = template
    .replace(/\{\{TITLE\}\}/g, docData.name)
    .replace(/\{\{SLUG\}\}/g, docData.slug)
    .replace(/\{\{LANGUAGE\}\}/g, docData.language)
    .replace(/\{\{LANGUAGE_LABEL\}\}/g, docData.languageLabel)
    .replace(/\{\{VERSION\}\}/g, docData.version)
    .replace(/\{\{DESCRIPTION\}\}/g, docData.description)
    .replace(/\{\{TAGS\}\}/g, tagsHTML)
    .replace(/\{\{GITHUB_LINK\}\}/g, githubLinkHTML)
    .replace(/\{\{SIDEBAR_NAV\}\}/g, sidebarNav)
    .replace(/\{\{CONTENT\}\}/g, content);

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
          <div style="display:flex;gap:0.25rem;">
            <a href="/blog" class="nav-link">blog</a>
            <a href="/docs" class="nav-link">docs</a>
          </div>
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
