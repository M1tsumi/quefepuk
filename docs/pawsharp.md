# PawSharp (v0.6.0-alpha1)

**Language:** C# (.NET 8+) | **GitHub:** https://github.com/M1tsumi/PawSharp | **Tags:** discord, dotnet, websocket

A .NET 8+ Discord API wrapper providing a REST client with 140+ endpoints, a WebSocket gateway for 40+ real-time events, built-in caching, slash command interactions, and automatic sharding.

> **Alpha notice:** PawSharp is currently in pre-release. Public APIs may change between alpha releases. Pin package versions when building against an alpha build.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quickstart](#quickstart)
4. [Configuration](#configuration)
5. [Core Concepts](#core-concepts)
6. [REST API — Messages](#rest-api--messages)
7. [REST API — Guilds & Channels](#rest-api--guilds--channels)
8. [REST API — Roles, Webhooks & Threads](#rest-api--roles-webhooks--threads)
9. [Gateway & Events](#gateway--events)
10. [Commands](#commands)
11. [Caching](#caching)
12. [Common Patterns](#common-patterns)
13. [Error Handling](#error-handling)
14. [Troubleshooting](#troubleshooting)
15. [Best Practices](#best-practices)

---

## Overview

PawSharp is a .NET 8+ Discord API wrapper built around clean abstractions and a dependency-injection-first design. Rather than bundling everything into a single assembly, it is split into focused NuGet packages so you only take on what you actually need.

### Package List

| Package | Purpose |
|---|---|
| `PawSharp.Core` | Base entities, enums, and exceptions shared by all packages |
| `PawSharp.API` | REST client with 140+ Discord API endpoints |
| `PawSharp.Gateway` | WebSocket gateway and real-time event dispatcher (40+ events) |
| `PawSharp.Cache` | In-memory and Redis caching providers |
| `PawSharp.Client` | Unified entry-point that wires REST, Gateway, and Cache together |
| `PawSharp.Commands` | Prefix-based command framework with module support |
| `PawSharp.Interactions` | Slash commands and other application command types |
| `PawSharp.Interactivity` | Reaction menus, pagination, and component helpers |
| `PawSharp.Voice` | Voice channel support (experimental) |

### REST API Coverage

| Category | Coverage |
|---|---|
| Messages | Full — send, edit, delete, bulk-delete, pin, reactions, typing |
| Channels | Full — all channel types, invites, webhooks, threads |
| Guilds | Full — CRUD, audit logs, scheduled events, auto-moderation |
| Members & Users | Full — member management, role assignment, bans, kicks |
| Roles | Full — CRUD, permission management, assignment |
| Slash Commands | Full — global and guild-scoped application commands |
| Interactions | Full — responses, follow-ups, modals |
| Webhooks | Full — create, execute, manage |
| Threads | Full — create, archive, membership |
| Voice | Partial (experimental) |

---

## Installation

### Prerequisites

- **.NET 8.0 SDK or later** — [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0)
- A Discord bot token — [Discord Developer Portal](https://discord.com/developers/applications)
- Basic familiarity with C# and async/await

### Recommended Setup

For most bots, install the unified client bundle along with the command and interaction packages:

```bash
dotnet add package PawSharp.Client
dotnet add package PawSharp.Commands
dotnet add package PawSharp.Interactions
dotnet add package Microsoft.Extensions.Logging.Console
```

### Minimal / Component Setup

If you only need specific functionality, install individual packages:

```bash
# REST API only (no gateway events)
dotnet add package PawSharp.API

# Gateway only (no REST)
dotnet add package PawSharp.Gateway

# Caching (included in PawSharp.Client)
dotnet add package PawSharp.Cache

# Redis distributed cache (requires StackExchange.Redis)
dotnet add package PawSharp.Cache
dotnet add package StackExchange.Redis
```

> **Version pinning:** During the alpha phase, minor version bumps may include breaking changes. Use an exact version constraint in your `.csproj`:
> ```xml
> <PackageReference Include="PawSharp.Client" Version="0.6.0-alpha1" />
> ```

---

## Quickstart

The following example creates a fully working bot that responds to a prefix command. It demonstrates service registration, event subscription, and graceful shutdown.

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PawSharp.Client;
using PawSharp.Core.Enums;
using PawSharp.Gateway.Events;

// 1. Configure services
var services = new ServiceCollection()
    .AddLogging(b => b.AddConsole())
    .AddSingleton(new PawSharpOptions
    {
        Token   = Environment.GetEnvironmentVariable("DISCORD_TOKEN")
                  ?? throw new InvalidOperationException("DISCORD_TOKEN is not set"),
        Intents = GatewayIntents.AllUnprivileged | GatewayIntents.MessageContent,
        ApiVersion = 10,
    })
    .AddPawSharp();

// 2. Resolve the client
var provider = services.BuildServiceProvider();
var client   = provider.GetRequiredService<DiscordClient>();

// 3. Subscribe to events before connecting
client.Gateway.EventDispatcher.On<ReadyEvent>(ready =>
{
    Console.WriteLine($"Connected as {ready.User.Username}#{ready.User.Discriminator}");
    Console.WriteLine($"Guilds: {ready.Guilds.Count}");
    return Task.CompletedTask;
});

client.Gateway.EventDispatcher.On<MessageCreateEvent>(async msg =>
{
    if (msg.Author.IsBot) return;

    if (msg.Content == "!ping")
    {
        await client.Rest.CreateMessageAsync(msg.ChannelId, new()
        {
            Content = "Pong!",
        });
    }
});

// 4. Connect and block until Ctrl+C
using var cts = new CancellationTokenSource();
Console.CancelKeyPress += async (_, e) =>
{
    e.Cancel = true;
    Console.WriteLine("Shutting down...");
    await client.DisconnectAsync();
    cts.Cancel();
};

await client.ConnectAsync();
Console.WriteLine("Bot is running. Press Ctrl+C to stop.");
await Task.Delay(Timeout.Infinite, cts.Token);
```

Set your token as an environment variable before running:

```powershell
# Windows PowerShell
$env:DISCORD_TOKEN = "your_token_here"
dotnet run
```

```bash
# Linux / macOS
export DISCORD_TOKEN=your_token_here
dotnet run
```

---

## Configuration

### PawSharpOptions

All configuration is provided through a single `PawSharpOptions` object registered in the DI container.

```csharp
var options = new PawSharpOptions
{
    // Required
    Token      = Environment.GetEnvironmentVariable("DISCORD_TOKEN")!,
    ApiVersion = 10,

    // Gateway - specify only the intents your bot uses
    Intents = GatewayIntents.AllUnprivileged | GatewayIntents.MessageContent,

    // Sharding - Discord requires sharding for bots in 2500+ guilds
    Shards       = ShardingStrategy.Auto,  // Calculate automatically
    TotalShards  = 4,                      // Override when using manual sharding
    ShardId      = 0,                      // Which shard this instance owns

    // Reconnection strategy
    ReconnectTimeout     = TimeSpan.FromSeconds(1),
    MaxReconnectAttempts = 5,

    // Cache limits
    CacheSettings = new CacheSettings
    {
        MaxCachedGuilds           = 1_000,
        MaxCachedChannelsPerGuild = 100,
        MaxCachedMessages         = 10_000,
        MessageCacheTTL           = TimeSpan.FromHours(1),
    },
};
```

### Gateway Intents

Intents control which events Discord sends to your bot. Only request the intents you need.

```csharp
// Standard setup for most bots
var intents = GatewayIntents.AllUnprivileged
    | GatewayIntents.MessageContent;

// Narrow scope — only guilds and messages
var intents = GatewayIntents.Guilds
    | GatewayIntents.GuildMessages
    | GatewayIntents.DirectMessages;
```

> **Privileged intents:** `MessageContent`, `GuildMembers`, and `GuildPresences` must be enabled in the Discord Developer Portal under *Bot → Privileged Gateway Intents* before your bot can request them.

### Dependency Injection

```csharp
// Default in-memory cache
services
    .AddSingleton(options)
    .AddPawSharp();

// Redis distributed cache
services
    .AddSingleton(options)
    .AddPawSharp(cache: new RedisCacheProvider("localhost:6379"));

var client = services
    .BuildServiceProvider()
    .GetRequiredService<DiscordClient>();
```

---

## Core Concepts

### DiscordClient

The `DiscordClient` is the central object you resolve from the DI container. It provides access to every subsystem.

```csharp
var client = provider.GetRequiredService<DiscordClient>();

var rest         = client.Rest;          // IDiscordRestClient - 140+ endpoints
var gateway      = client.Gateway;       // IGatewayClient - WebSocket + dispatcher
var cache        = client.Cache;         // IEntityCache - in-memory or Redis
var interactions = client.Interactions;  // IInteractionsClient - slash commands
```

### REST vs Gateway

| Task | Subsystem |
|---|---|
| Send or edit a message | `client.Rest` |
| Create or delete a channel | `client.Rest` |
| Ban or kick a member | `client.Rest` |
| Fetch guild or user data on demand | `client.Rest` |
| React to a new incoming message | `client.Gateway.EventDispatcher` |
| React when a member joins or leaves | `client.Gateway.EventDispatcher` |
| React to role or channel changes | `client.Gateway.EventDispatcher` |

### Entity IDs (Snowflakes)

All Discord entity IDs are 64-bit unsigned integers known as snowflakes. Always use `ulong` — never strings.

```csharp
ulong guildId   = 1234567890123456789;
ulong channelId = 9876543210987654321;
ulong userId    = 1111111111111111111;

// Snowflakes encode a creation timestamp (Discord epoch: 2015-01-01)
var createdAt = DateTimeOffset.FromUnixTimeMilliseconds(
    (long)((guildId >> 22) + 1420070400000UL));
Console.WriteLine($"Guild created: {createdAt:yyyy-MM-dd}");
```

### Async/Await Throughout

Every I/O operation in PawSharp is asynchronous. Blocking on async code with `.Result` or `.Wait()` risks thread-pool starvation and deadlocks. Always `await`.

```csharp
// Correct
var message = await client.Rest.CreateMessageAsync(channelId, request);

// Avoid: blocks the thread and can cause deadlocks
var guild = client.Rest.GetGuildAsync(guildId).Result;   // BAD
```

---

## REST API — Messages

### Sending Messages

```csharp
// Plain text
await client.Rest.CreateMessageAsync(channelId, new CreateMessageRequest
{
    Content = "Hello from PawSharp.",
});

// With embed
var embed = new Embed
{
    Title       = "Server Report",
    Description = "Daily activity summary.",
    Color       = 0x3498DB,
    Fields = new List<EmbedField>
    {
        new() { Name = "Messages", Value = "1,234", Inline = true },
        new() { Name = "Members",  Value = "567",   Inline = true },
    },
    Footer    = new EmbedFooter { Text = "Generated at" },
    Timestamp = DateTime.UtcNow,
};

await client.Rest.CreateMessageAsync(channelId, new CreateMessageRequest
{
    Content = "Here is today's summary:",
    Embeds  = new List<Embed> { embed },
});
```

### Retrieving Messages

```csharp
// Most recent 50 messages
var messages = await client.Rest.GetChannelMessagesAsync(channelId, limit: 50);

// Paginate backwards through history
var older = await client.Rest.GetChannelMessagesAsync(
    channelId, limit: 50, before: messages.Last().Id);

// Single message by ID
var single = await client.Rest.GetMessageAsync(channelId, messageId);

// Pinned messages
var pinned = await client.Rest.GetPinnedMessagesAsync(channelId);
```

### Editing and Deleting

```csharp
await client.Rest.EditMessageAsync(channelId, messageId, new EditMessageRequest
{
    Content = "Updated content.",
});

await client.Rest.DeleteMessageAsync(channelId, messageId);

// Bulk delete (2–100 messages, must be under 14 days old)
var ids = messages.Take(25).Select(m => m.Id).ToList();
if (ids.Count >= 2)
    await client.Rest.BulkDeleteMessagesAsync(channelId, ids);
```

### Pins and Typing

```csharp
await client.Rest.PinMessageAsync(channelId, messageId);
await client.Rest.UnpinMessageAsync(channelId, messageId);
await client.Rest.TriggerTypingIndicatorAsync(channelId);
```

### Reactions

```csharp
// Unicode emoji
await client.Rest.CreateReactionAsync(channelId, messageId, "thumbsup");

// Custom emoji (name:id format)
await client.Rest.CreateReactionAsync(channelId, messageId, "customemoji:123456789");

await client.Rest.DeleteOwnReactionAsync(channelId, messageId, "thumbsup");
await client.Rest.DeleteUserReactionAsync(channelId, messageId, "thumbsup", userId);

var reactors = await client.Rest.GetReactionsAsync(channelId, messageId, "thumbsup");
```

---

## REST API — Guilds & Channels

### Guild Information

```csharp
var guild = await client.Rest.GetGuildAsync(guildId);
Console.WriteLine($"{guild.Name} — {guild.MemberCount} members");

// With approximate counts
var guildDetails = await client.Rest.GetGuildAsync(guildId, withCounts: true);
Console.WriteLine($"Approximate members: {guildDetails.ApproximateMemberCount}");
```

### Managing Members

```csharp
var member = await client.Rest.GetGuildMemberAsync(guildId, userId);

await client.Rest.ModifyGuildMemberAsync(guildId, userId, new ModifyGuildMemberRequest
{
    Nickname = "Community Helper",
    RoleIds  = new List<ulong> { helperRoleId },
});

await client.Rest.RemoveGuildMemberAsync(guildId, userId, reason: "Violated server rules");
await client.Rest.CreateGuildBanAsync(guildId, userId, deleteMessageDays: 7, reason: "Spam");
await client.Rest.RemoveGuildBanAsync(guildId, userId);
```

### Channels

```csharp
var channels = await client.Rest.GetGuildChannelsAsync(guildId);
var textChannels = channels.Where(c => c.Type == ChannelType.GuildText);

var newChannel = await client.Rest.CreateGuildChannelAsync(guildId, new CreateChannelRequest
{
    Name     = "announcements",
    Type     = ChannelType.GuildText,
    Topic    = "Official server announcements.",
    ParentId = categoryId,
});

await client.Rest.ModifyChannelAsync(channelId, new ModifyChannelRequest
{
    Name  = "important-announcements",
    Topic = "Read-only announcements.",
});

await client.Rest.DeleteChannelAsync(channelId);
```

### Invites

```csharp
var invite = await client.Rest.CreateChannelInviteAsync(channelId, new CreateInviteRequest
{
    MaxUses = 1,
    MaxAge  = 3600,   // 1 hour
});
Console.WriteLine($"discord.gg/{invite.Code}");
```

### Audit Logs

```csharp
var log = await client.Rest.GetGuildAuditLogsAsync(guildId, limit: 50);
foreach (var entry in log.AuditLogEntries)
    Console.WriteLine($"{entry.ActionType} by user {entry.UserId}: {entry.Reason}");

// Filter to ban actions only
var banLog = await client.Rest.GetGuildAuditLogsAsync(
    guildId, actionType: AuditLogEvent.MemberBanAdd, limit: 10);
```

---

## REST API — Roles, Webhooks & Threads

### Roles

```csharp
var roles = await client.Rest.GetGuildRolesAsync(guildId);

var newRole = await client.Rest.CreateGuildRoleAsync(guildId, new CreateRoleRequest
{
    Name        = "Moderator",
    Color       = 0x3498DB,
    Hoist       = true,
    Mentionable = true,
});

await client.Rest.AddGuildMemberRoleAsync(guildId, userId, roleId);
await client.Rest.RemoveGuildMemberRoleAsync(guildId, userId, roleId);
await client.Rest.DeleteGuildRoleAsync(guildId, roleId);
```

### Webhooks

```csharp
var webhook = await client.Rest.CreateWebhookAsync(channelId, new CreateWebhookRequest
{
    Name = "Status Updates",
});

await client.Rest.ExecuteWebhookAsync(webhook.Id, webhook.Token, new ExecuteWebhookRequest
{
    Content  = "Deployment finished successfully.",
    Username = "CI Bot",
});

await client.Rest.DeleteWebhookAsync(webhook.Id);
```

### Threads

```csharp
var thread = await client.Rest.CreateThreadFromMessageAsync(
    channelId, messageId,
    new CreateThreadRequest
    {
        Name                = "Feedback: Feature Request",
        AutoArchiveDuration = 1440,   // Archive after 24 hours
    }
);

await client.Rest.JoinThreadAsync(thread.Id);
await client.Rest.AddThreadMemberAsync(thread.Id, userId);
await client.Rest.LeaveThreadAsync(thread.Id);

var activeThreads = await client.Rest.GetActiveThreadsAsync(guildId);
```

---

## Gateway & Events

### Subscribing to Events

```csharp
var dispatcher = client.Gateway.EventDispatcher;

// Subscribe with a lambda
dispatcher.On<MessageCreateEvent>(msg =>
{
    Console.WriteLine($"{msg.Author.Username}: {msg.Content}");
    return Task.CompletedTask;
});

// Subscribe with a named method
dispatcher.On<GuildMemberAddEvent>(OnMemberJoinedAsync);

private async Task OnMemberJoinedAsync(GuildMemberAddEvent e)
{
    await client.Rest.CreateMessageAsync(welcomeChannelId, new()
    {
        Content = $"Welcome to the server, {e.User.Username}!",
    });
}
```

### Middleware

Middleware runs before every event handler. Use it for logging, error catching, and filtering.

```csharp
// Global error boundary — register before any On<> subscriptions
dispatcher.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unhandled error in event handler for {EventType}",
            ctx.GetType().Name);
    }
});

// Ignore all events from bots
dispatcher.Use(async (ctx, next) =>
{
    if (ctx is MessageCreateEvent msg && msg.Author.IsBot)
        return;
    await next();
});
```

### Event Reference

| Category | Events |
|---|---|
| Connection | `ReadyEvent`, `ResumedEvent` |
| Messages | `MessageCreateEvent`, `MessageUpdateEvent`, `MessageDeleteEvent`, `MessageDeleteBulkEvent` |
| Guilds | `GuildCreateEvent`, `GuildUpdateEvent`, `GuildDeleteEvent` |
| Members | `GuildMemberAddEvent`, `GuildMemberUpdateEvent`, `GuildMemberRemoveEvent` |
| Channels | `ChannelCreateEvent`, `ChannelUpdateEvent`, `ChannelDeleteEvent`, `ChannelPinsUpdateEvent` |
| Roles | `GuildRoleCreateEvent`, `GuildRoleUpdateEvent`, `GuildRoleDeleteEvent` |
| Reactions | `MessageReactionAddEvent`, `MessageReactionRemoveEvent`, `MessageReactionRemoveAllEvent` |
| Threads | `ThreadCreateEvent`, `ThreadUpdateEvent`, `ThreadDeleteEvent`, `ThreadMembersUpdateEvent` |
| Interactions | `InteractionCreateEvent` |
| Voice | `VoiceStateUpdateEvent`, `VoiceServerUpdateEvent` |
| Presence | `PresenceUpdateEvent` |
| Typing | `TypingStartEvent` |
| Bans | `GuildBanAddEvent`, `GuildBanRemoveEvent` |

### Connection Management

```csharp
await client.ConnectAsync();
await client.DisconnectAsync();

// PawSharp reconnects automatically on unexpected disconnects.
// Check IsConnected to inspect current state.
if (!client.Gateway.IsConnected)
    await client.Gateway.ConnectAsync();
```

### Sharded Gateway

Discord requires bots in 2,500+ guilds to use sharding.

```csharp
var options = new PawSharpOptions
{
    Token  = token,
    Shards = ShardingStrategy.Auto,
};

services.AddSingleton(options).AddPawSharp();

var shardManager = provider.GetRequiredService<ShardManager>();
await shardManager.ConnectAllAsync();

// Events are dispatched across all shards automatically
foreach (var (shardId, status) in shardManager.GetAllShardStatuses())
    Console.WriteLine($"Shard {shardId}: {status}");
```

---

## Commands

### Prefix Commands

Create a class that inherits `BaseCommandModule` and decorate methods with `[Command]`.

```csharp
using PawSharp.Commands;
using PawSharp.Commands.Attributes;
using PawSharp.Core.Models;

public class ModerationCommands : BaseCommandModule
{
    private readonly IDiscordRestClient _rest;

    public ModerationCommands(IDiscordRestClient rest) => _rest = rest;

    [Command("kick")]
    [Description("Remove a member from the server.")]
    public async Task KickAsync(CommandContext ctx, ulong userId,
        [Remainder] string reason = "No reason provided")
    {
        await _rest.RemoveGuildMemberAsync(ctx.Guild.Id, userId, reason: reason);
        await ctx.RespondAsync(new CreateMessageRequest
        {
            Content = $"Member {userId} has been kicked. Reason: {reason}",
        });
    }

    [Command("purge")]
    [Description("Delete the last N messages (2-100).")]
    public async Task PurgeAsync(CommandContext ctx, int count)
    {
        count = Math.Clamp(count, 2, 100);
        var messages = await _rest.GetChannelMessagesAsync(ctx.Channel.Id, limit: count);
        var ids = messages.Select(m => m.Id).ToList();
        await _rest.BulkDeleteMessagesAsync(ctx.Channel.Id, ids);
        await ctx.RespondAsync(new() { Content = $"Deleted {ids.Count} messages." });
    }
}
```

Register the extension in DI, then wire up modules:

```csharp
// In service registration — call AddCommands() after AddPawSharp()
services
    .AddSingleton(options)
    .AddPawSharp()
    .AddCommands(new CommandsConfiguration { Prefix = "!" });

// After BuildServiceProvider(), register modules
var commands = client.GetExtension<CommandsExtension>();
await commands.RegisterModuleAsync<ModerationCommands>();

client.Gateway.EventDispatcher.On<MessageCreateEvent>(async msg =>
{
    if (!msg.Author.IsBot && msg.Content.StartsWith("!"))
        await commands.ProcessCommandAsync(msg.Content, msg, prefix: "!");
});
```

### Slash Commands

Register a global slash command once at startup. Global commands are available in every server and direct message.

```csharp
var appId = client.CurrentUser.Id;

await client.Rest.CreateGlobalApplicationCommandAsync(appId,
    new CreateApplicationCommandRequest
    {
        Name        = "ping",
        Description = "Check if the bot is responding.",
        Type        = ApplicationCommandType.ChatInput,
    });

// A command with an option
await client.Rest.CreateGlobalApplicationCommandAsync(appId,
    new CreateApplicationCommandRequest
    {
        Name        = "echo",
        Description = "Repeat some text back.",
        Type        = ApplicationCommandType.ChatInput,
        Options = new List<ApplicationCommandOption>
        {
            new()
            {
                Name        = "text",
                Description = "The text to repeat.",
                Type        = ApplicationCommandOptionType.String,
                Required    = true,
            },
        },
    });
```

Handle interactions from the gateway:

```csharp
client.Gateway.EventDispatcher.On<InteractionCreateEvent>(async interaction =>
{
    if (interaction.Type != InteractionType.ApplicationCommand)
        return;

    switch (interaction.Data?.Name)
    {
        case "ping":
            await client.Rest.CreateInteractionResponseAsync(
                interaction.Id, interaction.Token,
                new InteractionResponse
                {
                    Type = InteractionResponseType.ChannelMessageWithSource,
                    Data = new InteractionCallbackData { Content = "Pong!" },
                });
            break;

        case "echo":
            var text = interaction.Data?.Options
                ?.FirstOrDefault(o => o.Name == "text")?.Value?.ToString()
                ?? "(nothing)";
            await client.Rest.CreateInteractionResponseAsync(
                interaction.Id, interaction.Token,
                new InteractionResponse
                {
                    Type = InteractionResponseType.ChannelMessageWithSource,
                    Data = new InteractionCallbackData { Content = text },
                });
            break;
    }
});
```

### Deferred Responses

If your handler needs more than three seconds, defer the response to avoid a timeout.

```csharp
client.Gateway.EventDispatcher.On<InteractionCreateEvent>(async interaction =>
{
    // Immediately acknowledge — shows "Bot is thinking..."
    await client.Rest.CreateInteractionResponseAsync(
        interaction.Id, interaction.Token,
        new InteractionResponse
        {
            Type = InteractionResponseType.DeferredChannelMessageWithSource,
        });

    // Do slow work (database query, external API call, etc.)
    var result = await SlowOperationAsync();

    // Edit the deferred message with the final result
    await client.Rest.EditOriginalInteractionResponseAsync(
        interaction.ApplicationId, interaction.Token,
        new EditWebhookMessageRequest { Content = result });
});
```

---

## Caching

### Automatic Caching

When PawSharp connects to the gateway, the built-in `CacheManager` subscribes to entity lifecycle events and keeps the cache up to date automatically.

```csharp
var cache = client.Cache;

// Retrieve from cache (synchronous, sub-millisecond)
var guild   = cache.GetGuild(guildId);
var channel = cache.GetChannel(channelId);
var user    = cache.GetUser(userId);
var message = cache.GetMessage(messageId);

// Collections
var channels = cache.GetGuildChannels(guildId);
var members  = cache.GetGuildMembers(guildId);

// Statistics
var stats    = cache.GetCacheStats();
var memoryMB = cache.GetMemoryUsage() / 1024.0 / 1024.0;
Console.WriteLine($"Guilds: {stats.GuildCount}, Messages: {stats.MessageCount}");
Console.WriteLine($"Memory: {memoryMB:F1} MB");
```

### In-Memory Cache Limits

| Limit | Default | Notes |
|---|---|---|
| Max entries (total) | 10,000 | Configurable via `CacheSettings` |
| Max per entity type | 5,000 | Individually bounded per type |
| Eviction policy | FIFO | Oldest entry removed when limit reached |

### Redis Distributed Cache

Replace the default provider with Redis when running multiple shards across separate processes.

```csharp
services.AddSingleton<IEntityCache>(
    new RedisCacheProvider("localhost:6379")
);
services.AddPawSharp();

// With authentication
var redisOptions = Options.Create(new RedisCacheOptions
{
    ConnectionString = "redis.example.com:6379",
    Password         = Environment.GetEnvironmentVariable("REDIS_PASSWORD"),
    DefaultExpiry    = TimeSpan.FromHours(24),
});
services.AddSingleton<IEntityCache>(new RedisCacheProvider(redisOptions));
```

### Cache-First Helper Pattern

```csharp
public async Task<Guild?> GetGuildAsync(ulong guildId)
{
    var cached = client.Cache.GetGuild(guildId);
    if (cached != null)
        return cached;   // Cache hit — instant

    // Cache miss — fetch from Discord and store
    var guild = await client.Rest.GetGuildAsync(guildId);
    if (guild != null)
        client.Cache.CacheGuild(guild);

    return guild;
}
```

### Cache Invalidation

Subscribe to update and delete events to keep the cache accurate when entities change.

```csharp
dispatcher.On<GuildUpdateEvent>(e =>
{
    client.Cache.CacheGuild(e.Guild);   // Overwrites stale entry
    return Task.CompletedTask;
});

dispatcher.On<GuildDeleteEvent>(e =>
{
    client.Cache.RemoveGuild(e.Id);
    return Task.CompletedTask;
});

dispatcher.On<ChannelUpdateEvent>(e =>
{
    client.Cache.CacheChannel(e.Channel);
    return Task.CompletedTask;
});
```

---

## Common Patterns

### Per-User Command Cooldowns

```csharp
public class CooldownManager
{
    private readonly Dictionary<ulong, DateTime> _lastUsed = new();
    private readonly TimeSpan _cooldown;

    public CooldownManager(TimeSpan cooldown) => _cooldown = cooldown;

    public bool TryUse(ulong userId, out TimeSpan remaining)
    {
        if (_lastUsed.TryGetValue(userId, out var last))
        {
            remaining = _cooldown - (DateTime.UtcNow - last);
            if (remaining > TimeSpan.Zero) return false;
        }
        _lastUsed[userId] = DateTime.UtcNow;
        remaining         = TimeSpan.Zero;
        return true;
    }
}

var cooldown = new CooldownManager(TimeSpan.FromSeconds(5));

dispatcher.On<MessageCreateEvent>(async msg =>
{
    if (!msg.Content.StartsWith("!")) return;

    if (!cooldown.TryUse(msg.Author.Id, out var remaining))
    {
        await client.Rest.CreateMessageAsync(msg.ChannelId, new()
        {
            Content = $"Please wait {remaining.TotalSeconds:F1} seconds.",
        });
        return;
    }

    // Process command normally
});
```

### Moderation with Audit Logging

```csharp
public class ModerationService
{
    private readonly IDiscordRestClient _rest;
    private readonly ulong _modLogChannelId;

    public async Task KickAsync(ulong guildId, ulong targetId, string reason)
    {
        await _rest.RemoveGuildMemberAsync(guildId, targetId, reason: reason);
        await LogAsync("Kick", targetId, reason);
    }

    public async Task BanAsync(ulong guildId, ulong targetId, string reason, int deleteDays = 0)
    {
        await _rest.CreateGuildBanAsync(guildId, targetId, deleteDays, reason: reason);
        await LogAsync("Ban", targetId, reason);
    }

    private async Task LogAsync(string action, ulong targetId, string reason)
    {
        var embed = new Embed
        {
            Title  = $"Moderation — {action}",
            Color  = 0xE74C3C,
            Fields = new List<EmbedField>
            {
                new() { Name = "Target", Value = $"<@{targetId}>",        Inline = true  },
                new() { Name = "Action", Value = action,                    Inline = true  },
                new() { Name = "Reason", Value = reason ?? "Not provided",  Inline = false },
            },
            Timestamp = DateTime.UtcNow,
        };

        await _rest.CreateMessageAsync(_modLogChannelId, new()
        {
            Embeds = new List<Embed> { embed },
        });
    }
}
```

### Welcome Message on Member Join

```csharp
// Replace with your server's default member role ID (0 = no default role assigned)
ulong defaultRoleId = 0;

dispatcher.On<GuildMemberAddEvent>(async member =>
{
    var guild = client.Cache.GetGuild(member.GuildId)
             ?? await client.Rest.GetGuildAsync(member.GuildId);

    if (guild == null) return;

    // Resolve the welcome channel from cache or REST
    var channels = client.Cache.GetGuildChannels(member.GuildId)
                ?? await client.Rest.GetGuildChannelsAsync(member.GuildId);

    var welcomeChannel = channels
        ?.FirstOrDefault(c => c.Name == "welcome" && c.Type == ChannelType.GuildText);

    if (welcomeChannel == null) return;

    await client.Rest.CreateMessageAsync(welcomeChannel.Id, new CreateMessageRequest
    {
        Content = $"<@{member.User.Id}> just joined the server.",
        Embeds  = new List<Embed>
        {
            new()
            {
                Title       = $"Welcome, {member.User.Username}!",
                Description = $"You are member #{guild.MemberCount}.",
                Color       = 0x2ECC71,
                Timestamp   = DateTime.UtcNow,
            },
        },
    });

    if (defaultRoleId != 0)
        await client.Rest.AddGuildMemberRoleAsync(member.GuildId, member.User.Id, defaultRoleId);
});
```

---

## Error Handling

### Exception Types

| Exception | When thrown | Key Properties |
|---|---|---|
| `ValidationException` | Invalid input before the request is sent | `Message` |
| `RateLimitException` | Discord returned HTTP 429 | `RetryAfter` (TimeSpan) |
| `DiscordApiException` | Discord returned a non-2xx response | `StatusCode`, `ErrorCode` |
| `GatewayException` | WebSocket connection or protocol error | `CloseCode` |

### Catching REST Errors

```csharp
public async Task SafeSendAsync(ulong channelId, CreateMessageRequest request)
{
    try
    {
        await client.Rest.CreateMessageAsync(channelId, request);
    }
    catch (ValidationException ex)
    {
        _logger.LogWarning("Validation failed: {Message}", ex.Message);
    }
    catch (RateLimitException ex)
    {
        _logger.LogWarning("Rate limited — retrying after {Ms} ms",
            ex.RetryAfter.TotalMilliseconds);
        await Task.Delay(ex.RetryAfter);
        await client.Rest.CreateMessageAsync(channelId, request);
    }
    catch (DiscordApiException ex) when (ex.StatusCode == 403)
    {
        _logger.LogError("Permission denied posting to channel {ChannelId}", channelId);
    }
    catch (DiscordApiException ex)
    {
        _logger.LogError("Discord API error ({Code}): {Message}",
            ex.StatusCode, ex.Message);
    }
}
```

### Global Error Middleware

Exceptions thrown inside event handlers are silently swallowed by default. Register this middleware before any event subscriptions.

```csharp
dispatcher.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Uncaught exception in event handler: {EventType}",
            ctx.GetType().Name);
    }
});
```

---

## Troubleshooting

### Invalid Token

```csharp
// Trim whitespace that may have been added by the shell
var token = (Environment.GetEnvironmentVariable("DISCORD_TOKEN") ?? "").Trim();

if (string.IsNullOrEmpty(token))
    throw new InvalidOperationException("DISCORD_TOKEN is not set.");

var options = new PawSharpOptions { Token = token };
```

Other causes:
- Using a *user* token instead of a *bot* token
- Token was regenerated in the Developer Portal — the old token is immediately invalidated
- Token was committed to version control and Discord auto-revoked it

### Events Not Firing

```csharp
// Cause 1: Required intent not requested
// Without MessageContent, msg.Content will always be an empty string
Intents = GatewayIntents.AllUnprivileged | GatewayIntents.MessageContent,

// Cause 2: Privileged intent not enabled in the Developer Portal
// Fix: Enable under Bot -> Privileged Gateway Intents

// Cause 3: Subscribing after ConnectAsync may miss early events
// Always subscribe BEFORE calling ConnectAsync()
client.Gateway.EventDispatcher.On<MessageCreateEvent>(handler);
await client.ConnectAsync();   // Connect after subscribing
```

### Rate Limit Errors (HTTP 429)

```csharp
try
{
    await client.Rest.CreateMessageAsync(channelId, request);
}
catch (RateLimitException ex)
{
    await Task.Delay(ex.RetryAfter);
    await client.Rest.CreateMessageAsync(channelId, request);
}

// For bulk operations, space out requests
foreach (var name in roleNames)
{
    await client.Rest.CreateGuildRoleAsync(guildId, new CreateRoleRequest { Name = name });
    await Task.Delay(100);   // 100 ms gap reduces burst traffic
}
```

### Missing Permissions (HTTP 403)

Discord enforces role hierarchy — you can only modify members whose highest role is below your bot's highest role.

```csharp
var bot    = await client.Rest.GetGuildMemberAsync(guildId, client.CurrentUser.Id);
var target = await client.Rest.GetGuildMemberAsync(guildId, targetUserId);
var roles  = await client.Rest.GetGuildRolesAsync(guildId);

var botTop    = bot.RoleIds.Select(id => roles.First(r => r.Id == id)).Max(r => r.Position);
var targetTop = target.RoleIds.Select(id => roles.First(r => r.Id == id)).Max(r => r.Position);

if (botTop > targetTop)
    await client.Rest.RemoveGuildMemberAsync(guildId, targetUserId);
else
    Console.WriteLine("Cannot act: target's role is equal to or above the bot's.");
```

### High Memory Usage

```csharp
var options = new PawSharpOptions
{
    CacheSettings = new CacheSettings
    {
        MaxCachedMessages = 5_000,
        MessageCacheTTL   = TimeSpan.FromMinutes(30),
    },
};
```

### Collecting Debug Information

```csharp
Console.WriteLine(typeof(DiscordClient).Assembly.GetName().Version);
Console.WriteLine(System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription);
Console.WriteLine(System.Runtime.InteropServices.RuntimeInformation.OSDescription);
Console.WriteLine($"Is connected: {client.Gateway.IsConnected}");
```

Open an issue at [github.com/M1tsumi/PawSharp](https://github.com/M1tsumi/PawSharp/issues) with a minimal reproducible example, the full exception and stack trace, and the debug output above.

---

## Best Practices

### Never Hard-Code Tokens

```csharp
// Correct: read from the environment and trim whitespace
var token = (Environment.GetEnvironmentVariable("DISCORD_TOKEN") ?? "").Trim();
if (string.IsNullOrEmpty(token))
    throw new InvalidOperationException("DISCORD_TOKEN is not set.");

// Avoid: credentials in source code get committed to version control
var options = new PawSharpOptions { Token = "MzI4ODk1NzQ..." };   // BAD
```

### Subscribe to Events Before Connecting

```csharp
// Correct: subscribe first, then connect
client.Gateway.EventDispatcher.On<ReadyEvent>(handler);
client.Gateway.EventDispatcher.On<MessageCreateEvent>(handler);
await client.ConnectAsync();

// Incorrect: early events may fire before your handler is registered
await client.ConnectAsync();
client.Gateway.EventDispatcher.On<ReadyEvent>(handler);   // May have already fired
```

### Keep Event Handlers Non-Blocking

```csharp
// Correct: async throughout
dispatcher.On<MessageCreateEvent>(async msg =>
{
    var channel = await client.Rest.GetChannelAsync(msg.ChannelId);
    Console.WriteLine($"#{channel?.Name}: {msg.Content}");
});

// Avoid: .Result blocks the thread and can cause deadlocks
dispatcher.On<MessageCreateEvent>(msg =>
{
    var channel = client.Rest.GetChannelAsync(msg.ChannelId).Result;   // BAD
    return Task.CompletedTask;
});
```

### Use Global Error Middleware

```csharp
// Register before any On<> subscriptions
dispatcher.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unhandled exception in {EventType}", ctx.GetType().Name);
    }
});
```

### Graceful Shutdown

```csharp
using var cts = new CancellationTokenSource();

Console.CancelKeyPress += async (_, e) =>
{
    e.Cancel = true;
    Console.WriteLine("Received shutdown signal. Disconnecting...");
    await client.DisconnectAsync();
    cts.Cancel();
};

await client.ConnectAsync();
await Task.Delay(Timeout.Infinite, cts.Token);
Console.WriteLine("Shutdown complete.");
```

### Logging Setup

```csharp
// Development: verbose output
services.AddLogging(b => b.AddConsole().SetMinimumLevel(LogLevel.Debug));

// Production: information and above only
services.AddLogging(b => b.AddConsole().SetMinimumLevel(LogLevel.Information));
```

### Enable Auto-Sharding Early

`ShardingStrategy.Auto` is a no-op for small bots — enable it before you need it to avoid a migration at 2,500 guilds.

```csharp
var options = new PawSharpOptions
{
    Token  = token,
    Shards = ShardingStrategy.Auto,
};

var shardManager = provider.GetRequiredService<ShardManager>();
await shardManager.ConnectAllAsync();
```

---

(If you want a fully-rendered docs page with every section converted from HTML to Markdown, I can expand this file to include all sections verbatim.)
