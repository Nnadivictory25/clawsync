# PRD: ClawSync

## What this is

ClawSync is an open source, self-hostable AI agent platform built with React + Convex. It gives anyone a personal AI agent with a public chat UI, a private management dashboard (SyncBoard), a skills system, MCP server support, multi-model routing, channel integrations, and optional voice.

Think of it as the cloud version of OpenClaw. Where OpenClaw runs on your local machine, ClawSync runs on the web. It's designed for developers and startup founders who want to fork the repo, configure their agent's identity, connect their APIs, and ship in a weekend.

Repo: github.com/waynesutton/clawsync
Domain: clawsync.dev
First deployment: waynesutton.ai/agent (via integration)

## Why it's a separate app

The original plan was to build this inside waynesutton-ai. But the feature set has grown into a standalone product. Making it its own repo means:

- Any developer can fork clawsync and have their own agent running in minutes
- Clean separation between the agent platform and any specific site
- waynesutton.ai/agent just mounts the ClawSync frontend as a route (or iframe/embed)
- The repo ships with its own docs, README, AGENTS.md, CLAUDE.md, and setup instructions
- Open source from day one. MIT or similar license

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast, standard, same as waynesutton-ai |
| Backend | Convex (cloud or self-hosted) | Real-time, typed, agent component built in |
| Agent | @convex-dev/agent component | Thread management, RAG, tool calling, streaming |
| Models | Multi-provider via OpenRouter + direct | Claude, GPT, Gemini, open source models |
| Auth | WorkOS (future, not in v1) | Owner dashboard protection |
| Voice | @elevenlabs/elevenlabs-js (optional) | TTS/STT for voice mode |
| Hosting | Convex self-static-hosting or any static host | Netlify, Vercel, Fly, self-hosted Convex |
| Session sync | OpenSync (opensync.dev) | Cross-device session continuity |

## Naming

| Old name | New name |
|---|---|
| Mission control | SyncBoard |
| convex/agent/wayne.ts | convex/agent/clawsync.ts |
| waynesutton.ai/agent | Mounted route from ClawSync app |

## Core concepts

### The agent
A single AI agent with a configurable identity (soul document), system prompt, and skills. The soul document is editable from SyncBoard's UI. Default soul ships with the repo but every fork owner customizes their own.

### Soul document
A markdown file that defines who the agent is, what it knows, how it talks, and what it won't do. Inspired by soul.md. Editable via SyncBoard UI (stored in Convex, loaded into system prompt at runtime).

### AGENTS.md support
ClawSync ships with an AGENTS.md file at the repo root. This follows the agents.md standard (used by 60k+ open source projects). It tells AI coding agents (Claude Code, Codex, Cursor, Copilot) how to work on the codebase: build commands, test commands, code style, architecture decisions.

### CLAUDE.md support
ClawSync also ships a CLAUDE.md at the repo root for Claude Code compatibility. Contains project-specific instructions, Convex patterns, and security rules that Claude Code should follow when making changes.

### Multi-model support
The agent isn't locked to one LLM. Model configuration is stored in Convex and selectable from SyncBoard.

**Provider hierarchy:**
1. Direct provider APIs (Anthropic, OpenAI) for lowest latency
2. OpenRouter as a unified fallback for 300+ models
3. OpenCode Zen as an optional curated provider (tested/verified models)

**Model config stored in Convex:**
- Provider (anthropic, openai, openrouter, opencode-zen, custom)
- Model ID (e.g., claude-sonnet-4-20250514, gpt-5.1, openrouter/meta-llama/...)
- API key reference (env var name, not the key itself)
- Fallback model (if primary fails)
- Temperature, max tokens, system prompt overrides

**AI SDK integration:**
Uses Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/openai-compatible for OpenRouter) so model switching is a config change, not a code change.

### Skills (three types)
Same three-type system from the previous PRD, now with additional capabilities:

**Type 1: Skill templates** (no code, pick and configure from SyncBoard)
**Type 2: Webhook skills** (no code, connect any API from SyncBoard)
**Type 3: Code-defined skills** (TypeScript, requires git push)

**New: Skills with images**
Skills can accept and return images. The skill input/output schema supports base64 image data or Convex storage URLs. Useful for: screenshot analysis, image generation, chart rendering, document OCR.

**New: Skill metadata for UI and dependencies**
Each skill declares UI metadata in its registration:

```typescript
export const skillMeta = {
  name: "generate-chart",
  description: "Generate a chart from data",
  // UI metadata
  icon: "bar-chart",           // Lucide icon name
  category: "visualization",
  color: "#ea5b26",
  // Dependencies
  dependencies: ["recharts"],   // npm packages needed
  requiredEnvVars: ["CHART_API_KEY"],
  // Capability flags
  supportsImages: true,
  supportsStreaming: false,
  requiresApproval: true,
};
```

SyncBoard renders skill cards using this metadata. The dependency list is checked during skill activation.

**OpenAI Codex Skills compatibility**
ClawSync skills follow the same structure as the OpenAI Agent Skills standard (agentskills.io). Each skill has a SKILL.md with name, description, and metadata frontmatter. This means skills can be shared across ClawSync, Codex, and other compatible agents.

### MCP server support
ClawSync can act as an MCP server and connect to external MCP servers.

**As an MCP server:**
The agent exposes its skills as MCP tools. Any MCP client (Claude Desktop, Cursor, VS Code) can connect to ClawSync and use its skills. This is registered via the MCP protocol with proper tool descriptions and schemas.

**As an MCP client:**
SyncBoard lets you add external MCP servers. The agent can call tools from connected MCP servers alongside its own skills. Configuration stored in Convex:

```
mcpServers: [
  { name: "github", url: "https://mcp.github.com", apiKey: "env:GITHUB_MCP_KEY" },
  { name: "postgres", command: "npx @modelcontextprotocol/server-postgres", args: [...] }
]
```

**MCP Apps support:**
Following the MCP Apps extension spec, ClawSync skills can return interactive HTML UIs that render inline in the chat. A skill can return a chart, form, or dashboard that the user interacts with directly.

**Rate limits on MCP:**
Each connected MCP server has configurable rate limits in SyncBoard. Prevents runaway tool calls from burning through API quotas.

### Security checker
Built-in, always-on. Inspired by Claude Code's automated security reviews.

The security checker runs on every skill invocation, every MCP tool call, and every webhook. It's not optional. It's not a plugin. It's baked into the execution pipeline.

**Checks:**
- Approval gate (skill must be approved by owner)
- Status check (skill must be active)
- Rate limiting (per-skill, per-user, global)
- Domain allowlist (webhook skills only)
- Input validation (schema enforcement)
- Output validation (size limits, format checks)
- Secret isolation (skills can only access their own secrets)
- Timeout enforcement
- MCP tool call validation (connected server must be approved)

**Audit trail:**
Every invocation logged with: skill name, type, thread ID, user ID, channel, input (redacted), output (truncated), success/failure, security check result, duration, timestamp.

### OpenSync integration
ClawSync integrates with OpenSync (opensync.dev / github.com/waynesutton/opensync) for cross-device session synchronization. If a user starts a conversation on mobile and switches to desktop, the thread continues. OpenSync handles the session handoff via Convex.

### Channels
Same channel system as before: WhatsApp (Twilio), Telegram, Slack, Discord, email (Resend). Each channel funnels to the same agent brain. Configurable from SyncBoard.

### Activity feed
Public, real-time log of agent actions. Owner controls visibility per entry. Defaults to private.

### SyncBoard (formerly Mission Control)
The private admin dashboard. Protected by WorkOS auth (future, not wired in v1). Manages: agent config, soul document, model selection, skills, MCP servers, channels, threads, activity log, rate limits, domain allowlist, security events.

## Design system

ClawSync ships with a custom color palette. No Tailwind defaults.

| Token | Value | Usage |
|---|---|---|
| --bg-primary | #f3f3f3 | Page backgrounds |
| --bg-secondary | #ececec | Cards, sidebars, inputs |
| --bg-hover | #dbdbdb | Hover states |
| --text-primary | #232323 | Body text, headings |
| --text-secondary | #6a6a6a | Labels, captions, timestamps |
| --border | #c7c6c5 | Borders, dividers |
| --accent | #93908f | Muted accents, icons |
| --interactive | #ea5b26 | Buttons, checkboxes, active states, links |
| --interactive-hover | #d24714 | Button hover, active link hover |
| --surface | #ececec | Checkboxes background, archive cards |
| --meta-theme | #f3f3f3 | Mobile browser chrome color |

UI components can be toggled on/off from SyncBoard. The frontend respects a component visibility config stored in Convex:

```typescript
uiConfig: {
  showActivityFeed: true,
  showVoiceToggle: false,
  showModelBadge: true,
  showSkillIndicators: true,
  showTypingIndicator: true,
  chatPlaceholder: "Ask me anything...",
  agentAvatarUrl: "/avatar.png",
  maxMessageLength: 4000,
}
```

## Convex components architecture

ClawSync is built on top of Convex components and should make it easy to add new ones. Convex components are sandboxed mini-backends. They have their own database tables, their own functions, and can't access your app's data unless you pass it in explicitly. Install from npm, register in `convex.config.ts`, and use.

### Core components (installed at launch)

| Component | Package | Purpose |
|---|---|---|
| Agent | @convex-dev/agent | Thread management, tool calling, RAG, streaming |
| Rate Limiter | @convex-dev/rate-limiter | Per-scope rate limiting for chat, skills, channels |
| Action Cache | @convex-dev/action-cache | Cache expensive LLM calls and API responses |

### Recommended components (add as needed)

| Component | Package | Purpose |
|---|---|---|
| RAG | @convex-dev/rag | Standalone RAG for knowledge base skills |
| Persistent Text Streaming | @convex-dev/persistent-text-streaming | Stream agent responses to browser + persist |
| Presence | @convex-dev/presence | Show who's online in chat |
| WorkOS AuthKit | @convex-dev/workos-authkit | SyncBoard authentication |
| Stripe | @convex-dev/stripe | Usage-based billing (if you charge for API access) |
| Better Auth | @convex-dev/better-auth | Alternative auth with 80+ OAuth providers |
| Stagehand | @convex-dev/stagehand | Browser automation skills (via Browserbase) |
| NeutralCost | @convex-dev/neutralcost | Track AI usage costs across providers |
| Firecrawl Scrape | @convex-dev/firecrawl-scrape | Web scraping with caching for scraper skills |
| R2 | @convex-dev/r2 | Cloudflare R2 file storage for large skill outputs |

### How components are registered

All components go in `convex/convex.config.ts`. This is the single registration point:

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import actionCache from "@convex-dev/action-cache/convex.config";
// Add more components as needed:
// import rag from "@convex-dev/rag/convex.config";
// import presence from "@convex-dev/presence/convex.config.js";
// import stripe from "@convex-dev/stripe/convex.config";

const app = defineApp();
app.use(agent);
app.use(rateLimiter);
app.use(actionCache);
// app.use(rag);
// app.use(presence);
// app.use(stripe);
export default app;
```

After adding a component:
1. Run `npx convex dev` to generate the component's code in `convex/_generated/`
2. Import from `components` in your Convex functions: `import { components } from "./_generated/api"`
3. Use the component's API: `const result = await ctx.runQuery(components.rateLimiter.someFunction)`

### Component isolation (why this matters for security)

Components can't read your tables or call your functions unless you pass them in. This means:
- The agent component can't read your skillSecrets table directly (good)
- The rate limiter has its own counters table (no conflicts with your data)
- A buggy third-party component can't corrupt your schema
- Component mutations participate in the same transaction as your code (atomic)

### Adding new components (docs for fork owners)

The README and `docs/components.md` will explain:

1. Find a component at convex.dev/components
2. `npm install @convex-dev/whatever`
3. Add `import whatever from "@convex-dev/whatever/convex.config"` to `convex/convex.config.ts`
4. Add `app.use(whatever)` in the same file
5. Run `npx convex dev` to regenerate
6. Import `{ components }` and use the component's API in your Convex functions
7. If the component needs env vars, set them in Convex Dashboard

### Local components (custom)

Fork owners can also create local components for features specific to their deployment. A local component is just a folder with its own `convex.config.ts`:

```
convex/
  components/
    myCustomComponent/
      convex.config.ts    # defineComponent("myCustomComponent")
      schema.ts           # Component's own schema
      functions.ts        # Component's functions
```

Register it the same way:
```typescript
import myCustomComponent from "./components/myCustomComponent/convex.config";
app.use(myCustomComponent);
```

This is useful for packaging up domain-specific logic (e.g., a billing component, a CRM sync component) that should be sandboxed from the core agent.

## Pages and routes

### Public

| Route | Purpose |
|---|---|
| / | Landing page (optional, can be disabled) |
| /chat | Chat with the agent + activity feed |
| /chat/voice | Voice mode (ElevenLabs, optional) |

### SyncBoard (auth required)

| Route | Purpose |
|---|---|
| /syncboard | Dashboard overview |
| /syncboard/soul | Soul document editor |
| /syncboard/models | Model configuration + fallbacks |
| /syncboard/skills | Manage all skill types |
| /syncboard/skills/new | Add skill (template picker or webhook builder) |
| /syncboard/skills/[id] | Edit skill, view invocation logs |
| /syncboard/mcp | Manage MCP server connections |
| /syncboard/channels | Configure messaging channels |
| /syncboard/channels/new | Add channel connection |
| /syncboard/threads | View all conversations |
| /syncboard/activity | Full activity log + security events |
| /syncboard/config | UI config, rate limits, domain allowlist |

### API / Webhook endpoints

| Endpoint | Purpose |
|---|---|
| /api/webhook/telegram | Telegram inbound |
| /api/webhook/whatsapp | WhatsApp/Twilio inbound |
| /api/webhook/slack | Slack Events API inbound |
| /api/webhook/discord | Discord Interactions inbound |
| /api/webhook/email | Email inbound parse |
| /api/mcp | MCP server endpoint (ClawSync as MCP server) |

## Convex schema

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent identity and config
  agentConfig: defineTable({
    name: v.string(),
    soulDocument: v.string(),
    systemPrompt: v.string(),
    model: v.string(),
    modelProvider: v.string(),
    fallbackModel: v.optional(v.string()),
    fallbackProvider: v.optional(v.string()),
    voiceEnabled: v.boolean(),
    voiceId: v.optional(v.string()),
    domainAllowlist: v.array(v.string()),
    uiConfig: v.string(), // JSON
    updatedAt: v.number(),
  }),

  // Model provider configs
  modelProviders: defineTable({
    providerId: v.string(),
    displayName: v.string(),
    baseUrl: v.string(),
    apiKeyEnvVar: v.string(),
    enabled: v.boolean(),
    rateLimitPerMinute: v.number(),
    updatedAt: v.number(),
  }).index("by_provider", ["providerId"]),

  // Skills registry (all three types)
  skillRegistry: defineTable({
    name: v.string(),
    description: v.string(),
    skillType: v.union(
      v.literal("template"),
      v.literal("webhook"),
      v.literal("code")
    ),
    templateId: v.optional(v.string()),
    config: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    ),
    permissions: v.array(v.string()),
    rateLimitPerMinute: v.number(),
    timeoutMs: v.optional(v.number()),
    supportsImages: v.optional(v.boolean()),
    supportsStreaming: v.optional(v.boolean()),
    uiMeta: v.optional(v.string()), // JSON: icon, category, color, dependencies
    approved: v.boolean(),
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_type", ["skillType"])
    .index("by_name", ["name"]),

  // Skill secrets (encrypted, separate from config)
  skillSecrets: defineTable({
    skillId: v.id("skillRegistry"),
    key: v.string(),
    encryptedValue: v.string(),
    createdAt: v.number(),
  }).index("by_skill", ["skillId"]),

  // Skill template definitions
  skillTemplates: defineTable({
    templateId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    configSchema: v.string(),
    inputSchema: v.string(),
    outputDescription: v.string(),
    supportsImages: v.boolean(),
    version: v.string(),
  }).index("by_templateId", ["templateId"])
    .index("by_category", ["category"]),

  // Skill invocation audit log
  skillInvocationLog: defineTable({
    skillName: v.string(),
    skillType: v.string(),
    threadId: v.optional(v.string()),
    userId: v.optional(v.string()),
    channel: v.optional(v.string()),
    input: v.string(),
    output: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    securityCheckResult: v.string(),
    durationMs: v.number(),
    timestamp: v.number(),
  }).index("by_skill", ["skillName"])
    .index("by_timestamp", ["timestamp"])
    .index("by_security_result", ["securityCheckResult"]),

  // --- Summary table for dashboard reads (cold table pattern) ---
  skillInvocationSummary: defineTable({
    skillName: v.string(),
    totalInvocations: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    avgDurationMs: v.number(),
    lastInvokedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_skill", ["skillName"]),

  // MCP server connections
  mcpServers: defineTable({
    name: v.string(),
    url: v.optional(v.string()),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    apiKeyEnvVar: v.optional(v.string()),
    enabled: v.boolean(),
    rateLimitPerMinute: v.number(),
    approved: v.boolean(),
    lastHealthCheck: v.optional(v.number()),
    healthStatus: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // Activity log
  activityLog: defineTable({
    actionType: v.string(),
    summary: v.string(),
    channel: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_visibility_timestamp", ["visibility", "timestamp"])
    .index("by_channel", ["channel"]),

  // Channel configs
  channelConfig: defineTable({
    channelType: v.string(),
    displayName: v.string(),
    enabled: v.boolean(),
    rateLimitPerMinute: v.number(),
    webhookUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_type", ["channelType"]),

  // Channel secrets
  channelSecrets: defineTable({
    channelId: v.id("channelConfig"),
    key: v.string(),
    encryptedValue: v.string(),
    createdAt: v.number(),
  }).index("by_channel", ["channelId"]),

  // Channel users
  channelUsers: defineTable({
    platformId: v.string(),
    channelType: v.string(),
    displayName: v.optional(v.string()),
    threadId: v.optional(v.string()),
    lastActiveAt: v.number(),
    createdAt: v.number(),
  }).index("by_platform", ["channelType", "platformId"]),

  // Rate limit configs
  rateLimitConfig: defineTable({
    scope: v.string(),
    maxRequests: v.number(),
    windowMs: v.number(),
    updatedAt: v.number(),
  }).index("by_scope", ["scope"]),

  // OpenSync sessions
  syncSessions: defineTable({
    sessionToken: v.string(),
    userId: v.optional(v.string()),
    threadId: v.string(),
    deviceInfo: v.optional(v.string()),
    lastActiveAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["sessionToken"])
    .index("by_user", ["userId"]),
});
```

## Convex scale patterns

These patterns prevent the issues described in "what breaks at scale with Convex." The @convex-dev/rate-limiter component handles rate limiting with built-in sharding. The @convex-dev/action-cache component caches expensive LLM and API calls.

### 1. Summary tables (cold table pattern)
Dashboard reads come from `skillInvocationSummary`, not from scanning `skillInvocationLog`. A cron job runs every 5 minutes to batch-aggregate from the hot log table into the cold summary table.

```
writes -> skillInvocationLog (hot)
              |
              v  (cron, every 5 min)
reads  -> skillInvocationSummary (cold)
```

SyncBoard dashboard widgets read from summary tables only.

### 2. No .collect() without limits
Every query uses `.take(n)` or paginated queries with `hasMore`. Never `.collect()` on tables that could grow beyond a few hundred rows.

### 3. Index everything
Every query in the app uses a defined index. No full-table scans. The schema above has indexes on every field used in `where` clauses.

### 4. Isolate background work
Cron jobs (summary aggregation, health checks, cleanup) run in separate Convex actions. They never share cursors or compete with real-time agent traffic.

### 5. Keep documents small
Skill invocation logs truncate output at 10KB. Large responses are stored in Convex file storage with a reference in the log. Activity log metadata is optional and capped.

## Packages to install

### Core (required)
```bash
npm install @convex-dev/agent @convex-dev/rate-limiter @convex-dev/action-cache @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/openai-compatible zod
```

### Recommended (add as needed)
```bash
npm install @convex-dev/rag                           # Knowledge base RAG
npm install @convex-dev/persistent-text-streaming     # Stream + persist agent responses
npm install @convex-dev/presence                      # Online presence in chat
npm install @convex-dev/workos-authkit                # SyncBoard auth
npm install @convex-dev/neutralcost                   # AI cost tracking
```

### Optional
```bash
npm install @elevenlabs/elevenlabs-js                 # Phase 5 (voice)
npm install @convex-dev/stripe                        # Usage billing
npm install @convex-dev/stagehand                     # Browser automation skills
npm install @convex-dev/firecrawl-scrape              # Web scraping skills
```

## Hosting options

### Option A: Convex Cloud + static host (recommended for most users)
- Backend: Convex cloud (free tier works)
- Frontend: Netlify, Vercel, or any static host
- Simplest setup, zero infrastructure management

### Option B: Self-hosted Convex + static host
- Backend: Self-hosted Convex via Docker (get-convex/convex-backend)
- Frontend: Any static host or same server
- For users who need full data control

### Option C: Self-hosted everything
- Backend: Self-hosted Convex on Fly.io, AWS, or bare metal
- Frontend: Served from same Docker compose setup
- For maximum control

The README includes setup instructions for all three options.

## Environment variables

```bash
# Required
ANTHROPIC_API_KEY=              # Default model provider
CONVEX_DEPLOYMENT=              # Convex project URL (cloud) or self-hosted URL

# Multi-model (optional)
OPENAI_API_KEY=                 # For OpenAI models or embeddings
OPENROUTER_API_KEY=             # For OpenRouter model access
OPENCODE_ZEN_API_KEY=           # For OpenCode Zen curated models

# Security
SKILL_SECRET_ENCRYPTION_KEY=    # Encrypts secrets in skill/channel tables

# Channels (Phase 4, set as needed)
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
RESEND_API_KEY=

# Voice (Phase 5)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

## File structure

```
clawsync/
  README.md                          # Setup guide, fork instructions
  AGENTS.md                          # For AI coding agents (agents.md standard)
  CLAUDE.md                          # For Claude Code
  LICENSE                            # MIT or similar
  package.json
  vite.config.ts
  tsconfig.json
  .env.example

  content/
    soul.md                          # Default soul document (user customizes)

  src/
    main.tsx
    App.tsx
    styles/
      tokens.css                     # CSS custom properties (design system)
      global.css
    pages/
      ChatPage.tsx                   # /chat - public agent chat + activity feed
      ChatVoicePage.tsx              # /chat/voice (Phase 5)
      SyncBoard.tsx                  # /syncboard - dashboard layout
      SyncBoardSoul.tsx              # /syncboard/soul
      SyncBoardModels.tsx            # /syncboard/models
      SyncBoardSkills.tsx            # /syncboard/skills
      SyncBoardSkillNew.tsx          # /syncboard/skills/new
      SyncBoardSkillDetail.tsx       # /syncboard/skills/[id]
      SyncBoardMcp.tsx               # /syncboard/mcp
      SyncBoardChannels.tsx          # /syncboard/channels
      SyncBoardChannelNew.tsx        # /syncboard/channels/new
      SyncBoardThreads.tsx           # /syncboard/threads
      SyncBoardActivity.tsx          # /syncboard/activity
      SyncBoardConfig.tsx            # /syncboard/config
    components/
      chat/
        AgentChat.tsx
        ActivityFeed.tsx
        VoiceToggle.tsx
        MessageBubble.tsx
        ImagePreview.tsx             # For image skill responses
      syncboard/
        ThreadViewer.tsx
        SkillList.tsx
        SkillTemplatePicker.tsx
        SkillTemplateConfigForm.tsx
        SkillWebhookBuilder.tsx
        SkillTestRunner.tsx
        SkillApprovalModal.tsx
        SkillInvocationHistory.tsx
        McpServerList.tsx
        McpServerForm.tsx
        ModelSelector.tsx
        SoulEditor.tsx
        ChannelManager.tsx
        ChannelConfigForm.tsx
        RateLimitEditor.tsx
        DomainAllowlistEditor.tsx
        UiConfigEditor.tsx

  convex/
    convex.config.ts                 # Agent component registration
    schema.ts                        # Full schema (above)
    agent/
      clawsync.ts                    # Agent definition
      toolLoader.ts                  # Dynamic tool loading from skillRegistry + MCP
      security.ts                    # Security checker
      activityLogger.ts              # Activity log helpers
      modelRouter.ts                 # Multi-model provider routing
      skills/
        templates/
          apiCaller.ts
          rssFetcher.ts
          webScraper.ts
          emailSender.ts
          webhookCaller.ts
          scheduledTask.ts
          contentPoster.ts
          knowledgeLookup.ts
          calculator.ts
          imageAnalyzer.ts           # Image input skill template
        siteSearch.ts                # Code-defined skill example
    mcp/
      server.ts                      # ClawSync as MCP server
      client.ts                      # Connect to external MCP servers
    webhooks/
      shared.ts
      telegram.ts
      whatsapp.ts
      slack.ts
      discord.ts
      email.ts
    opensync/
      sessions.ts                    # OpenSync session management
    agentConfig.ts
    skillRegistry.ts
    skillSecrets.ts
    skillTemplates.ts
    skillInvocations.ts
    skillSummary.ts                  # Summary table cron + queries
    modelProviders.ts
    mcpServers.ts
    activityLog.ts
    channelConfig.ts
    channelSecrets.ts
    rateLimits.ts
    crons.ts                         # Summary aggregation, health checks
    http.ts                          # HTTP routes (webhooks, MCP endpoint)

  docs/
    setup.md                         # Step-by-step setup for new forks
    components.md                    # How to add/use Convex components
    soul-document.md                 # How to write your soul document
    skills.md                        # How to create and manage skills
    mcp.md                           # MCP server integration guide
    models.md                        # Multi-model configuration guide
    channels.md                      # Channel integration guide
    security.md                      # Security architecture overview
    self-hosting.md                  # Self-hosted Convex setup
    contributing.md                  # How to contribute
    opensync.md                      # OpenSync integration guide
```

## Development phases

### Phase 1: Core agent + chat UI
- Init repo, Vite, React, Convex
- Install @convex-dev/agent, configure convex.config.ts
- Define agent in convex/agent/clawsync.ts with default soul
- Create agentConfig table, seed with default soul document
- Build /chat page: chat UI + activity feed sidebar
- Design system: CSS custom properties with ClawSync color palette
- Rate limiting for public sessions
- Activity logging
- Ship: README, AGENTS.md, CLAUDE.md, .env.example, LICENSE
- Create first code-defined skill (site search)
- Multi-model config: Anthropic direct + OpenRouter fallback

### Phase 2: SyncBoard
- Build /syncboard layout (no auth wiring yet, flag-gated)
- Soul document editor (markdown editor, save to Convex)
- Model selector (provider, model ID, fallback config)
- Thread viewer (list threads, view messages)
- Activity log viewer with filters
- UI config editor (toggle components, set placeholder text)
- Rate limit configuration
- Basic skill list view

### Phase 3: Self-serve skills + security
- Skill templates table + seeding
- Template skill executor (generic Convex actions)
- Webhook skill executor
- Skill secrets (encrypted storage)
- Security checker (all checks, always-on)
- SyncBoard skills/new: template picker + webhook builder
- SyncBoard skills/[id]: edit, logs, toggle, approve/reject
- Domain allowlist management
- Skill test runner (dry-run)
- Image skill support
- Skill metadata (icon, category, dependencies)
- Summary table cron for dashboard performance

### Phase 4: MCP + channels
- MCP server endpoint (ClawSync as MCP server)
- MCP client (connect to external MCP servers)
- SyncBoard MCP management UI
- Channel webhook handlers (Telegram first)
- WhatsApp, Slack, Discord, Email
- Channel config UI in SyncBoard
- OpenSync session sync integration

### Phase 5: Voice
- ElevenLabs SDK
- Voice toggle on /chat
- Agent text -> TTS
- STT -> agent input
- Voice rate limiting
- Voice activity logging

### Phase 6: Polish + docs
- Comprehensive README with fork instructions
- Setup docs for all three hosting options
- Skill creation guide
- MCP integration guide
- Security architecture doc
- Contributing guide
- npm package (optional: publish @clawsync/core)

## Security requirements

1. Security checker runs on every skill invocation, MCP call, and webhook. Not optional.
2. All skills require owner approval before activation
3. API keys stored in Convex env vars only. Skill/channel secrets in encrypted tables.
4. Domain allowlist enforced on all outbound HTTP (webhook skills)
5. No HTTP redirects followed (SSRF prevention)
6. Response size limits on webhook responses (50KB default)
7. Webhook signature verification per platform
8. Session isolation (users see only their own threads)
9. Activity feed defaults to private
10. Secrets never in frontend, LLM context, or logs
11. Rate limiting at every entry point (chat, channels, skills, MCP, voice)
12. Audit trail for every agent action
13. MCP servers require explicit approval before agent can use their tools
14. No .collect() without .take(n) limit anywhere in the codebase

## Rate limiting defaults

| Scope | Default |
|---|---|
| Public chat (per session) | 10 messages/min |
| Channel user (per user) | 20 messages/min |
| Skill invocation (per skill) | 30 calls/min |
| Webhook skill (global) | 100 calls/min |
| MCP tool call (per server) | 50 calls/min |
| Voice session (per session) | 5 min/hour |
| Global (all users) | 200 messages/min |

All configurable from SyncBoard.

## Default soul document

Ships at `content/soul.md`. Fork owners replace this with their own identity.

```markdown
# Soul Document

## Identity
I am [Your Name]'s AI agent, running on ClawSync. I help visitors learn about
[Your Name]'s work, answer questions, and connect people to the right resources.

## Knowledge
- [Your Name]'s professional background and interests
- Projects and open source work
- Technical topics relevant to [Your Name]'s expertise

## Communication style
- Direct and helpful
- Developer-friendly tone
- No hype, no fluff
- Concise answers, with depth available on request

## Boundaries
- I don't share private contact information
- I don't make commitments on [Your Name]'s behalf
- I don't provide financial or legal advice
- I redirect sensitive requests to [Your Name] directly

## When uncertain
- I say "I'm not sure about that" rather than guessing
- I suggest the visitor reach out directly
- I log the question for [Your Name] to review
```

## Success criteria

- Developer can fork the repo, configure their soul, add an API key, and have a working agent in under 10 minutes
- Agent responds using the configured model with the soul document personality
- Skills are addable from SyncBoard without code (Type 1 and Type 2)
- Security checker blocks unapproved or misconfigured skills
- MCP servers can connect and provide tools to the agent
- Multiple model providers work via config change
- Activity feed shows real-time agent activity
- All conversations logged and viewable in SyncBoard
- Zero secrets exposed to frontend or LLM context
- Scales to 10K+ threads without .collect() or hot table issues
- Repo has clear README, AGENTS.md, CLAUDE.md, setup docs
- Open source, forkable, self-hostable
