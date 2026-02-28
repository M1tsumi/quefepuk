# PawSharp (v0.6.0-alpha1)

**Name:** PawSharp

**Version:** 0.6.0-alpha1

**Language:** C# (.NET 8+)

**Description:** A .NET 8+ Discord API wrapper providing a REST client with 140+ endpoints, a WebSocket gateway for 40+ real-time events, built-in caching, slash command interactions, and automatic sharding.

**GitHub:** https://github.com/M1tsumi/PawSharp

**Tags:** discord, dotnet, websocket

---

## Table of contents
- Overview
- Installation
- Quickstart
- Configuration
- Core concepts
- Links

---

## Overview
PawSharp is a dependency-injection-first Discord library split into focused NuGet packages so you only take what you need (Core, API, Gateway, Cache, Client, Commands, Interactions, Interactivity, Voice).

## Installation
Prerequisites:
- .NET 8.0 SDK or later
- A Discord bot token (Discord Developer Portal)
- Basic familiarity with C# and async/await

Recommended bundle for most bots:

```bash
dotnet add package PawSharp.Client
dotnet add package PawSharp.Commands
dotnet add package PawSharp.Interactions
dotnet add package Microsoft.Extensions.Logging.Console
```

If you only need parts of the library, install component packages such as `PawSharp.API` (REST only) or `PawSharp.Gateway` (gateway only).

> Alpha notice: PawSharp is currently in pre-release. Public APIs may change between alpha releases. Pin package versions when building against an alpha.

## Quickstart (minimal)

Example: a simple prefix-based bot that responds to `!ping`.

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PawSharp.Client;

var services = new ServiceCollection()
    .AddLogging(b => b.AddConsole())
    .AddSingleton(new PawSharpOptions
    {
        Token = Environment.GetEnvironmentVariable("DISCORD_TOKEN") ?? throw new InvalidOperationException("DISCORD_TOKEN is not set"),
        Intents = GatewayIntents.AllUnprivileged | GatewayIntents.MessageContent,
        ApiVersion = 10,
    })
    .AddPawSharp();

var provider = services.BuildServiceProvider();
var client   = provider.GetRequiredService<DiscordClient>();

client.Gateway.EventDispatcher.On<MessageCreateEvent>(async msg =>
{
    if (msg.Author.IsBot) return;
    if (msg.Content == "!ping")
        await client.Rest.CreateMessageAsync(msg.ChannelId, new() { Content = "Pong!" });
});

await client.ConnectAsync();
```

Set your token before running:

```powershell
$env:DISCORD_TOKEN = "your_token_here"
dotnet run
```

## Configuration
Core configuration is provided via `PawSharpOptions` (token, intents, sharding strategy, cache settings, reconnect strategy). Use `AddPawSharp()` to register services into the DI container.

## Core concepts
- `DiscordClient` is the central object exposing `Rest`, `Gateway`, `Cache`, and `Interactions`.
- Use `client.Rest` for HTTP tasks (send/edit messages, manage guilds, channels, roles).
- Use `client.Gateway.EventDispatcher` for real-time events and subscriptions.
- The library is asynchronous-first; avoid blocking calls like `.Result`.

## Links
- Project: https://github.com/M1tsumi/PawSharp
- Raw JSON used to generate docs: `docs/pawsharp.json` (in this repo)

---

(If you want a fully-rendered docs page with every section converted from HTML to Markdown, I can expand this file to include all sections verbatim.)
