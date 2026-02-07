# ClawSync implementation guide

## Setup from scratch

### 1. Create the project

```bash
npm create vite@latest clawsync -- --template react-ts
cd clawsync
npx convex init
```

### 2. Install dependencies

```bash
# Core
npm install convex @convex-dev/agent @convex-dev/rate-limiter @convex-dev/action-cache @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/openai-compatible zod

# Recommended (add as needed)
# npm install @convex-dev/rag @convex-dev/persistent-text-streaming @convex-dev/presence
# npm install @convex-dev/workos-authkit @convex-dev/neutralcost
```

### 3. Configure convex.config.ts

This is the single file where all Convex components are registered. Components are sandboxed: they get their own database tables and can't access your app's data unless you pass it in.

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import actionCache from "@convex-dev/action-cache/convex.config";
// Uncomment as you add components:
// import rag from "@convex-dev/rag/convex.config";
// import presence from "@convex-dev/presence/convex.config.js";
// import textStreaming from "@convex-dev/persistent-text-streaming/convex.config";
// import neutralcost from "@convex-dev/neutralcost/convex.config";
// import stripe from "@convex-dev/stripe/convex.config";

const app = defineApp();
app.use(agent);
app.use(rateLimiter);
app.use(actionCache);
// app.use(rag);
// app.use(presence);
// app.use(textStreaming);
// app.use(neutralcost);
// app.use(stripe);
export default app;
```

After any change to this file, run `npx convex dev` to regenerate component code.

### 4. Set environment variables

In Convex Dashboard > Settings > Environment Variables:

```
ANTHROPIC_API_KEY=sk-ant-...
SKILL_SECRET_ENCRYPTION_KEY=<generate-a-random-256-bit-key>
```

Optional for multi-model:
```
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

### 5. Run dev

```bash
npx convex dev   # starts Convex backend
npm run dev       # starts Vite frontend
```

## Agent definition

The agent is defined in `convex/agent/clawsync.ts`. It uses @convex-dev/agent with dynamic tool loading and multi-model routing.

Key design: The agent definition is minimal. The soul document, model config, and tools are all loaded from Convex at runtime. This means SyncBoard changes take effect on the next message without redeploying.

```typescript
// convex/agent/clawsync.ts
import { Agent } from "@convex-dev/agent";
import { components } from "../_generated/api";

// Model is resolved at runtime from agentConfig table
// Tools are loaded dynamically from skillRegistry
// Soul document is loaded from agentConfig.soulDocument

export const clawsyncAgent = new Agent(components.agent, {
  name: "ClawSync Agent",
  // chat model resolved by modelRouter at invocation time
  // instructions loaded from agentConfig.soulDocument + systemPrompt
  tools: {}, // loaded dynamically
});
```

## Multi-model routing

The model router (`convex/agent/modelRouter.ts`) resolves which AI SDK provider and model to use based on the config in Convex.

**Provider mapping:**

| Provider ID | AI SDK package | Base URL |
|---|---|---|
| anthropic | @ai-sdk/anthropic | https://api.anthropic.com |
| openai | @ai-sdk/openai | https://api.openai.com |
| openrouter | @ai-sdk/openai-compatible | https://openrouter.ai/api/v1 |
| opencode-zen | @ai-sdk/openai-compatible or @ai-sdk/anthropic | https://opencode.ai/zen/v1 |
| custom | @ai-sdk/openai-compatible | User-provided base URL |

**Resolution order:**
1. Read agentConfig from Convex (model, modelProvider)
2. Read API key env var name from modelProviders table
3. Instantiate the AI SDK provider with the key
4. If primary fails, try fallbackModel + fallbackProvider
5. Log model selection and any fallback to activityLog

**OpenRouter integration:**
OpenRouter uses the OpenAI-compatible API format. Configure with:
```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": "https://clawsync.dev",
    "X-Title": "ClawSync",
  },
});
```

## Dynamic tool loading

`convex/agent/toolLoader.ts` assembles the agent's tools at invocation time.

**Sources:**
1. Skills from skillRegistry (approved + active)
2. Tools from connected MCP servers (approved + enabled)

**For each skill type:**
- Template: wrap generic executor with skill config
- Webhook: wrap webhook caller with skill config
- Code-defined: import the createTool directly

**For MCP servers:**
- Query mcpServers table (approved + enabled)
- Connect to each server
- List available tools
- Wrap each tool as an AI SDK tool with the MCP call as the handler

All tools pass through the security checker before execution.

## Security checker

`convex/agent/security.ts` is a plain function called inline before every tool execution.

```typescript
interface SecurityCheckResult {
  allowed: boolean;
  reason: string;
  code: "passed" | "unapproved" | "inactive" | "rate_limited" 
    | "domain_blocked" | "input_invalid" | "timeout" | "mcp_unapproved";
}

async function checkSecurity(
  ctx: ActionCtx,
  skill: SkillRecord,
  input: unknown,
): Promise<SecurityCheckResult> {
  // 1. Check approved === true
  // 2. Check status === "active"
  // 3. Check rate limit (query recent invocations)
  // 4. Check global rate limit
  // 5. For webhook: check domain allowlist
  // 6. Validate input against schema
  // 7. For MCP: check server approved
  // Returns result (always logged regardless of outcome)
}
```

The security checker is not a middleware or plugin. It's called directly in the tool execution path. Removing it would require modifying core agent code.

## MCP server integration

### ClawSync as MCP server

`convex/mcp/server.ts` exposes the agent's active skills as MCP tools via the /api/mcp endpoint. Any MCP client can connect.

The MCP server implements:
- `tools/list`: Returns all approved + active skills with descriptions and schemas
- `tools/call`: Routes to the skill executor (through security checker)
- `resources/list`: Returns available knowledge bases
- `resources/read`: Returns knowledge base content

### ClawSync as MCP client

`convex/mcp/client.ts` connects to external MCP servers configured in SyncBoard.

For each connected server:
1. Fetch tool list on connection (cache in memory)
2. Health check every 5 minutes via cron
3. Route tool calls through security checker
4. Rate limit per server
5. Log all calls to skillInvocationLog

## Convex scale patterns in practice

### Summary table cron

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.interval(
  "aggregate skill invocation summaries",
  { minutes: 5 },
  internal.skillSummary.aggregate,
);

crons.interval(
  "check MCP server health",
  { minutes: 5 },
  internal.mcpServers.healthCheck,
);

crons.interval(
  "cleanup old invocation logs",
  { hours: 24 },
  internal.skillInvocations.cleanup, // keep 30 days
);

export default crons;
```

### Query patterns

Bad:
```typescript
const allLogs = await ctx.db.query("skillInvocationLog").collect(); // trap
const count = allLogs.length;
```

Good:
```typescript
// Dashboard reads from summary table
const summary = await ctx.db
  .query("skillInvocationSummary")
  .withIndex("by_skill", (q) => q.eq("skillName", skillName))
  .first();

// Paginated log view
const page = await ctx.db
  .query("skillInvocationLog")
  .withIndex("by_timestamp")
  .order("desc")
  .paginate(paginationOpts);
```

### Document size control

```typescript
// Truncate large outputs before storing
const truncatedOutput = output.length > 10_000
  ? output.slice(0, 10_000) + "...[truncated]"
  : output;

// For very large responses, store in file storage
if (output.length > 50_000) {
  const storageId = await ctx.storage.store(
    new Blob([output], { type: "text/plain" })
  );
  await ctx.db.insert("skillInvocationLog", {
    ...logEntry,
    output: `storage:${storageId}`,
  });
}
```

## OpenSync session integration

`convex/opensync/sessions.ts` handles cross-device session continuity.

When a user starts a chat:
1. Generate or resume a session token (stored in localStorage)
2. Write to syncSessions table with token, threadId, deviceInfo
3. If user opens on another device with same token, resume the thread
4. OpenSync (opensync.dev) provides the token exchange mechanism

This is optional. If OpenSync isn't configured, sessions are device-local.

## Using Convex components in ClawSync

Every component is accessed via `components` from `"./_generated/api"`. Components are sandboxed: they have their own tables and can't touch your app's data.

### Rate Limiter

The @convex-dev/rate-limiter component handles all rate limiting with built-in sharding for scale. Define rate limits once, use everywhere.

```typescript
// convex/rateLimits.ts
import { RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  publicChat: { kind: "token bucket", rate: 10, period: 60_000, capacity: 10 },
  channelUser: { kind: "token bucket", rate: 20, period: 60_000, capacity: 20 },
  skillInvocation: { kind: "token bucket", rate: 30, period: 60_000, capacity: 30 },
  voiceSession: { kind: "token bucket", rate: 5, period: 3600_000, capacity: 5 },
  globalMessages: { kind: "token bucket", rate: 200, period: 60_000, capacity: 200 },
});

// Usage in a mutation or action:
await rateLimiter.limit(ctx, "publicChat", { key: sessionId, throws: true });
```

### Action Cache

The @convex-dev/action-cache component caches expensive LLM calls and external API responses. Prevents duplicate calls when the same skill runs with the same input.

```typescript
// convex/agent/skills/templates/apiCaller.ts
import { ActionCache } from "@convex-dev/action-cache";
import { components } from "../../_generated/api";

const cache = new ActionCache(components.actionCache, {
  action: internal.skills.templates.apiCaller.fetchFromApi,
  name: "api-caller-cache",
  // Cache for 5 minutes by default
  expiration: 5 * 60 * 1000,
});

// Cached call: same input returns cached result without hitting the API again
const result = await cache.fetch(ctx, { url, method, headers });
```

### RAG (optional)

The @convex-dev/rag component powers the Knowledge Lookup skill template. Add documents, search with embeddings.

```typescript
// convex/agent/skills/templates/knowledgeLookup.ts
import { RAG } from "@convex-dev/rag";
import { components } from "../../_generated/api";
import { openai } from "@ai-sdk/openai";

const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

// Add content
await rag.add(ctx, { namespace: "knowledge", text: documentContent });

// Search
const results = await rag.search(ctx, {
  namespace: "knowledge",
  text: userQuery,
  limit: 5,
});
```

### Persistent Text Streaming (optional)

The @convex-dev/persistent-text-streaming component streams agent responses to the browser via WebSocket while also persisting them to the database. Best of both worlds: the user sees text appear in real-time, and the full response is saved.

### Presence (optional)

The @convex-dev/presence component shows who's currently chatting with the agent. Useful for the activity feed or SyncBoard thread viewer.

### Adding new components later

Fork owners can add any component from convex.dev/components:

1. `npm install @convex-dev/whatever`
2. Add `import` and `app.use()` to `convex/convex.config.ts`
3. Run `npx convex dev` to regenerate
4. Use `components.whatever` in your Convex functions

Components are sandboxed. They can't read your tables, call your functions, or access your env vars unless you explicitly pass them in. This is safe by design.

### Creating local components

For custom features that should be sandboxed from the core agent:

```
convex/components/myFeature/
  convex.config.ts    # defineComponent("myFeature")
  schema.ts           # Its own tables
  functions.ts        # Its own functions
```

Register in `convex/convex.config.ts`:
```typescript
import myFeature from "./components/myFeature/convex.config";
app.use(myFeature);
```

## Webhook handler pattern

All inbound channel webhooks follow the same pattern in `convex/http.ts`:

```typescript
http.route({
  path: "/api/webhook/telegram",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Read raw body
    // 2. Verify platform signature (from channelSecrets)
    // 3. Parse payload
    // 4. Find/create channel user
    // 5. Find/create thread
    // 6. Load dynamic tools
    // 7. Run agent with tools
    // 8. Send response via platform API
    // 9. Log to activityLog
  }),
});
```

## Hosting setup

### Convex Cloud + Netlify (simplest)

```bash
# Deploy Convex functions
npx convex deploy

# Build frontend
npm run build

# Deploy to Netlify
netlify deploy --prod --dir dist
```

### Self-hosted Convex + Docker

Follow get-convex/convex-backend self-hosted guide:

```bash
# Clone Convex self-hosted config
npx degit get-convex/convex-backend/self-hosted/docker docker-setup
cd docker-setup
docker compose up -d

# Set self-hosted env vars
echo 'CONVEX_SELF_HOSTED_URL=http://localhost:3210' > .env.local
echo 'CONVEX_SELF_HOSTED_ADMIN_KEY=<your-admin-key>' >> .env.local

# Deploy functions to self-hosted backend
npx convex dev
```

### Self-hosted on Fly.io

```bash
npx degit get-convex/convex-backend/self-hosted/fly fly-setup
cd fly-setup
fly launch
fly secrets set CONVEX_CLOUD_ORIGIN="https://<app>.fly.dev"
fly secrets set CONVEX_SITE_ORIGIN="https://<app>.fly.dev/http"
```

## Repo files for open source

### AGENTS.md (for AI coding agents)

```markdown
# AGENTS.md

## Setup
- Install deps: `npm install`
- Start Convex: `npx convex dev`
- Start frontend: `npm run dev`
- Run tests: `npm test`

## Code style
- TypeScript strict mode
- Functional components, hooks only
- Convex functions use validators on all args
- No .collect() without .take(n) limit
- Every query uses a defined index

## Architecture
- convex/ contains all backend logic
- convex/agent/ is the agent core (do not modify security.ts without review)
- convex/agent/skills/templates/ are skill executors
- src/ contains React frontend
- src/pages/ maps to routes
- src/components/ are reusable UI pieces

## Security
- security.ts must run on every tool invocation
- Never store secrets in skillRegistry.config
- Never expose secrets to frontend or LLM context
- All webhook handlers must verify signatures
- Never use .collect() on tables that could grow large

## Testing
- Test skill invocations with the dry-run endpoint
- Verify security checker blocks unapproved skills
- Test webhook signature verification with invalid signatures
```

### CLAUDE.md (for Claude Code)

```markdown
# CLAUDE.md

## Project
ClawSync is an AI agent platform built with React + Convex.

## Commands
- `npm install` to install deps
- `npx convex dev` to start backend
- `npm run dev` to start frontend

## Convex patterns
- Always use validators on function args
- Always use indexes in queries
- Never use .collect() without .take(n)
- Use summary tables for dashboard reads
- Store large data in Convex file storage

## Security rules
- Do not modify convex/agent/security.ts without explicit approval
- Do not store API keys or secrets in source code
- Do not return secret values from any query or mutation
- All new skills must default to approved: false
- Webhook handlers must verify platform signatures

## File structure
- convex/agent/clawsync.ts: agent definition
- convex/agent/security.ts: security checker (do not bypass)
- convex/agent/toolLoader.ts: dynamic tool assembly
- convex/schema.ts: database schema
- src/pages/: route components
- content/soul.md: default soul document
```

## Environment variables reference

| Variable | Required | Phase | Description |
|---|---|---|---|
| ANTHROPIC_API_KEY | Yes (if default provider) | 1 | Anthropic API key |
| SKILL_SECRET_ENCRYPTION_KEY | Yes | 3 | Encrypts skill/channel secrets |
| OPENAI_API_KEY | Optional | 1 | OpenAI API key (models or embeddings) |
| OPENROUTER_API_KEY | Optional | 1 | OpenRouter unified API key |
| OPENCODE_ZEN_API_KEY | Optional | 1 | OpenCode Zen curated models |
| TELEGRAM_BOT_TOKEN | Phase 4 | 4 | Telegram bot credentials |
| TELEGRAM_WEBHOOK_SECRET | Phase 4 | 4 | Telegram webhook verification |
| TWILIO_ACCOUNT_SID | Phase 4 | 4 | Twilio credentials |
| TWILIO_AUTH_TOKEN | Phase 4 | 4 | Twilio credentials |
| TWILIO_WHATSAPP_NUMBER | Phase 4 | 4 | Twilio WhatsApp number |
| SLACK_BOT_TOKEN | Phase 4 | 4 | Slack bot credentials |
| SLACK_SIGNING_SECRET | Phase 4 | 4 | Slack signature verification |
| DISCORD_BOT_TOKEN | Phase 4 | 4 | Discord bot credentials |
| DISCORD_PUBLIC_KEY | Phase 4 | 4 | Discord signature verification |
| RESEND_API_KEY | Phase 4 | 4 | Email sending via Resend |
| ELEVENLABS_API_KEY | Phase 5 | 5 | ElevenLabs voice |
| ELEVENLABS_VOICE_ID | Phase 5 | 5 | ElevenLabs voice selection |
