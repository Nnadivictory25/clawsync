# AGENTS.md

## Project overview
ClawSync is an open source AI agent platform. React + TypeScript + Vite frontend. Convex backend. The agent uses @convex-dev/agent for thread management, tool calling, and streaming. Multi-model support via AI SDK.

## Setup commands
- Install deps: `npm install`
- Start Convex backend: `npx convex dev`
- Start frontend dev server: `npm run dev`
- Build for production: `npm run build`
- Deploy Convex functions: `npx convex deploy`
- Run tests: `npm test`
- Lint: `npm run lint`
- Type check: `npm run typecheck`

## Code style
- TypeScript strict mode
- React functional components with hooks only
- No class components
- Single quotes, semicolons
- Convex functions always validate args with `v.object({})`
- Use Convex validators, not Zod, inside Convex functions
- Zod is used in frontend form validation only
- Named exports preferred over default exports

## Architecture

### Backend (convex/)
- `convex/schema.ts`: Full database schema. Every table needs indexes for its query patterns.
- `convex/agent/clawsync.ts`: Agent definition. Do not hardcode tools here.
- `convex/agent/toolLoader.ts`: Loads tools dynamically from skillRegistry and MCP servers.
- `convex/agent/security.ts`: Security checker. Runs on every tool invocation. Do not modify without explicit review.
- `convex/agent/modelRouter.ts`: Resolves which AI SDK provider and model to use from config.
- `convex/agent/skills/templates/`: Generic executors for template and webhook skills.
- `convex/mcp/`: MCP server (outbound) and client (inbound) integration.
- `convex/webhooks/`: Channel webhook handlers. Each must verify platform signatures.
- `convex/crons.ts`: Background jobs (summary aggregation, health checks, cleanup).

### Frontend (src/)
- `src/pages/`: One component per route. Route names map to URL paths.
- `src/components/chat/`: Public-facing chat UI components.
- `src/components/syncboard/`: SyncBoard admin UI components.
- `src/styles/tokens.css`: CSS custom properties for the design system. Do not use hardcoded colors.

### Content
- `content/soul.md`: Default soul document. Fork owners replace this.

## Convex components
- All components registered in `convex/convex.config.ts` via `app.use()`.
- Components are sandboxed: own tables, own functions, can't access app data.
- Access components via `import { components } from "./_generated/api"`.
- Core components: @convex-dev/agent, @convex-dev/rate-limiter, @convex-dev/action-cache.
- To add a component: `npm install`, add `import` + `app.use()` to convex.config.ts, run `npx convex dev`.
- Never import directly from a component's internal files. Use the `components` object.
- Component mutations participate in the same transaction as your code (atomic rollback).

## Convex rules
- Never use `.collect()` without `.take(n)` on tables that could grow.
- Every query must use a defined index from schema.ts.
- Dashboard reads go to summary tables (cold), not log tables (hot).
- Store large data (>10KB) in Convex file storage, reference by ID.
- Background cron jobs must not share cursors with real-time operations.
- All mutations and actions validate their arguments.
- Internal functions use `internalMutation`/`internalAction`/`internalQuery`.

## Security rules
- `convex/agent/security.ts` must run on every tool invocation. No exceptions.
- Never store API keys or secrets in source code or in skillRegistry.config.
- Secrets go in `skillSecrets` or `channelSecrets` tables (encrypted).
- Never return secret values from any query, mutation, or action.
- New skills default to `approved: false`, `status: "pending"`.
- Webhook handlers must verify platform-specific signatures before processing.
- Domain allowlist checked on every webhook skill invocation.
- No HTTP redirects followed in webhook caller (SSRF prevention).

## Testing
- Test skill invocations using the dry-run feature in SyncBoard.
- Verify the security checker blocks unapproved skills.
- Test webhook handlers with invalid signatures (should return 401).
- Test rate limiting by sending requests above the configured limit.
- Verify summary table cron produces correct aggregations.

## PR guidelines
- Run `npm run lint` and `npm run typecheck` before committing.
- Include tests for new skills or security-related changes.
- Any change to security.ts requires a note in the PR description explaining why.
- Schema changes must include index definitions for new query patterns.
- Never commit .env files or API keys.
