# ClawSync security checklist

## Authentication and authorization

- [ ] SyncBoard routes gated (WorkOS auth planned, flag-gated in v1)
- [ ] Anonymous session tokens for public /chat users (localStorage UUID)
- [ ] Session tokens validated server-side in Convex
- [ ] Channel users identified by verified platform IDs
- [ ] Session isolation: users query only their own threads
- [ ] Owner-only mutations for agent config, skill approval, MCP server approval

## Security checker (always-on)

- [ ] Runs on every skill invocation (all three types)
- [ ] Runs on every MCP tool call
- [ ] Runs on every inbound webhook
- [ ] Cannot be disabled from SyncBoard or config
- [ ] Approval gate: reject unapproved skills
- [ ] Status check: reject inactive skills
- [ ] Per-skill rate limit enforcement
- [ ] Global skill invocation rate limit
- [ ] Domain allowlist for webhook skills (checked every invocation)
- [ ] Input validation against declared schema
- [ ] Output size validation (50KB default for webhooks)
- [ ] Timeout enforcement (kill and log if exceeded)
- [ ] MCP server approval check (server must be approved before tool use)
- [ ] Every check result logged to skillInvocationLog

## Skill security

### Template skills (Type 1)
- [ ] Execute through known, pre-built Convex actions only
- [ ] Config parsed server-side, validated against configSchema
- [ ] Config changes trigger re-review in SyncBoard

### Webhook skills (Type 2)
- [ ] Domain allowlist enforced on every invocation
- [ ] No HTTP redirects followed (SSRF prevention)
- [ ] Response size limit enforced (50KB default)
- [ ] Timeout enforced (10s default, configurable)
- [ ] URL parameter substitution sanitized against injection
- [ ] Secrets stored in skillSecrets table (encrypted, separate from config)
- [ ] Secrets read server-side only at runtime
- [ ] Secrets never in LLM context, frontend, or logs
- [ ] New domains require explicit owner addition to allowlist

### Code-defined skills (Type 3)
- [ ] Must export skillMeta with permissions and rate limits
- [ ] Auto-registered as pending on deploy
- [ ] Owner approval required before activation
- [ ] Cannot access other skills' secrets

### Image skills
- [ ] Image data validated (size limit, format check)
- [ ] No executable content accepted in image payloads
- [ ] Image storage uses Convex file storage (not inline base64 in DB)

## MCP security

- [ ] External MCP servers require explicit owner approval
- [ ] Per-server rate limits enforced
- [ ] MCP tool calls logged to skillInvocationLog
- [ ] MCP server health checked periodically
- [ ] Unhealthy servers auto-disabled with notification
- [ ] ClawSync MCP server endpoint validates client connections
- [ ] MCP Apps rendered in sandboxed iframes only

## Model provider security

- [ ] API keys stored as Convex env vars only
- [ ] API key env var names stored in DB, never the keys themselves
- [ ] OpenRouter API key separate from direct provider keys
- [ ] Model switching logged in activity log
- [ ] Fallback model activation logged

## Secret management

- [ ] All API keys in Convex environment variables
- [ ] Skill secrets in skillSecrets table (encrypted)
- [ ] Channel secrets in channelSecrets table (encrypted)
- [ ] SKILL_SECRET_ENCRYPTION_KEY as Convex env var
- [ ] Frontend never receives decrypted secrets
- [ ] SyncBoard masks secret values (last 4 chars only)
- [ ] .env files in .gitignore
- [ ] .env.example has no real values

## Webhook security (inbound channels)

- [ ] Telegram: verify X-Telegram-Bot-Api-Secret-Token header
- [ ] WhatsApp/Twilio: verify Twilio request signature
- [ ] Slack: verify X-Slack-Signature with signing secret
- [ ] Discord: verify Ed25519 signature with public key
- [ ] Email/Resend: verify webhook signature
- [ ] All failed verifications return 401 and log to activityLog
- [ ] Channel secrets in channelSecrets table (not channelConfig)

## Rate limiting

- [ ] Public chat: configurable per-session limit (default 10/min)
- [ ] Channel users: per-user limit (default 20/min)
- [ ] Skill invocations: per-skill limit (default 30/min)
- [ ] Webhook skills: global limit (default 100/min)
- [ ] MCP tool calls: per-server limit (default 50/min)
- [ ] Voice sessions: duration limit (default 5 min/hour)
- [ ] Global: all users combined (default 200/min)
- [ ] 429 responses with retry-after header
- [ ] Limits configurable from SyncBoard

## Data privacy

- [ ] Activity feed defaults to visibility: "private"
- [ ] Owner explicitly marks entries as "public"
- [ ] No user messages or PII in public activity
- [ ] Thread messages not exposed via any public endpoint
- [ ] Channel user metadata (phone, email) not in activity feed
- [ ] Skill invocation logs redact secrets and truncate outputs
- [ ] No PII in Convex function logs or error messages

## Input validation

- [ ] User messages length-limited (4000 chars default)
- [ ] Webhook payloads validated against expected schemas
- [ ] Skill inputs validated against declared schemas
- [ ] URL parameter substitution sanitized
- [ ] Template config validated against configSchema
- [ ] Domain allowlist entries validated (valid domains, no wildcards)
- [ ] MCP tool call inputs validated

## Convex scale safety

- [ ] No .collect() without .take(n) limit anywhere
- [ ] Every query uses a defined index
- [ ] Dashboard reads from summary tables (cold) not log tables (hot)
- [ ] Summary table cron runs on isolated schedule
- [ ] Large outputs stored in Convex file storage (not inline in DB)
- [ ] Document size kept under 16KB where possible
- [ ] Background jobs don't compete with real-time traffic

## Infrastructure

- [ ] HTTPS enforced on all endpoints
- [ ] CORS headers configured
- [ ] CSP headers configured
- [ ] Error responses don't leak implementation details
- [ ] No debug endpoints in production
- [ ] Self-hosted Convex: admin key rotated from defaults

## Open source safety

- [ ] .env.example contains no real values
- [ ] Default soul document contains no personal information
- [ ] README warns about setting own encryption key
- [ ] Setup guide includes security configuration steps
- [ ] Contributing guide includes security review process
- [ ] No hardcoded API keys, tokens, or secrets in codebase
- [ ] GitHub Actions (if used) use secrets, not env vars in code

## Monitoring and audit

- [ ] All agent interactions -> activityLog
- [ ] All skill invocations -> skillInvocationLog
- [ ] Security check failures logged with distinct codes
- [ ] Failed webhook verifications logged
- [ ] Rate limit violations logged
- [ ] Domain allowlist violations logged as security events
- [ ] MCP server health status tracked
- [ ] Model provider errors tracked
- [ ] SyncBoard shows: security events, failed invocations, rate limit hits

## Voice security (Phase 5)

- [ ] ElevenLabs API calls server-side only
- [ ] Voice session duration tracked and limited
- [ ] Voice input sanitized before agent processing
- [ ] No voice cloning or voice ID exposure
- [ ] Voice sessions logged
- [ ] Voice rate limits separate from text
