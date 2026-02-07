---
name: convex-react-patterns
description: "Use this skill whenever building React components that use Convex as their backend. Triggers include: any use of useQuery, useMutation, useAction from convex/react, ConvexProvider setup, preloadQuery/fetchQuery in Next.js, optimistic updates with Convex, auth gating with useConvexAuth, conditional queries with 'skip', error handling with ConvexError, or any discussion of building production-ready React UIs on top of Convex. Also use when reviewing Convex + React code for correctness, handling loading states from useQuery, structuring auth flows with Clerk/Auth0/ConvexAuth, or validating function arguments with v validators. Do NOT use for general React patterns unrelated to Convex, or for Convex backend-only patterns (schema design, cron jobs, file storage) that don't involve the React client layer."
---

# Bulletproof React Components for Convex Apps

## Overview

Convex handles reactivity, caching, consistent reads, and automatic retries. But the React layer must handle loading, auth, validation, conditional rendering, and errors correctly. This skill covers the patterns that make Convex + React apps production-ready.

## Quick Reference

| Problem | Convex Solution |
|---------|----------------|
| SSR crashes from browser APIs | Use `useQuery` instead of localStorage; returns `undefined` during SSR |
| Hydration flash / mismatch | Use `preloadQuery` + `usePreloadedQuery` in Next.js |
| Loading states | Check `useQuery() === undefined` for loading; never goes back to undefined after first load |
| Conditional queries | Pass `"skip"` as second arg to `useQuery` instead of conditional hooks |
| Stale data across components | Convex guarantees consistent reads; all subscriptions update together |
| Perceived latency on writes | `.withOptimisticUpdate()` on `useMutation` |
| Auth race conditions | Use `useConvexAuth()` / `<Authenticated>` / `<AuthLoading>` from convex/react |
| Malicious client input | Always use `args` with `v` validators on public functions |
| Internal-only functions | Use `internalMutation` / `internalQuery` / `internalAction` |
| Application errors | Throw `ConvexError` server-side; catch at `useMutation` call site |

---

## Pattern 1: Server-safe data fetching

**Problem**: Components that read `localStorage`, `window`, or other browser APIs crash during SSR.

**Solution**: Store user preferences in Convex. `useQuery` is SSR-safe because it returns `undefined` when there's no client connection.

```tsx
import { useQuery } from "convex/react"
import { api } from "../convex/_generated/api"

function ThemeProvider({ children }) {
  const prefs = useQuery(api.preferences.get)
  const theme = prefs?.theme ?? 'light'
  return <div className={theme}>{children}</div>
}
```

**Key rules**:
- `useQuery` returns `undefined` during SSR and initial client load
- Once loaded, it never returns `undefined` again (stays reactive)
- No need for `useEffect` + `localStorage` patterns when data is in Convex

---

## Pattern 2: Hydration-safe preloading (Next.js)

**Problem**: Server renders default state, client hydrates, then data loads and UI flashes.

**Solution**: Use `preloadQuery` in Server Components and `usePreloadedQuery` in Client Components.

```tsx
// Server Component
import { preloadQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"

export async function TasksWrapper() {
  const preloaded = await preloadQuery(api.tasks.list, { list: "default" })
  return <TaskList preloaded={preloaded} />
}
```

```tsx
// Client Component
"use client"
import { Preloaded, usePreloadedQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function TaskList({ preloaded }: {
  preloaded: Preloaded<typeof api.tasks.list>
}) {
  const tasks = usePreloadedQuery(preloaded)
  return <ul>{tasks.map(t => <li key={t._id}>{t.title}</li>)}</ul>
}
```

**Key rules**:
- `preloadQuery` uses `cache: 'no-store'` so pages using it won't be statically rendered
- Two separate `preloadQuery` calls are NOT guaranteed to reflect the same DB snapshot
- After hydration, the query becomes a live reactive subscription automatically
- For auth, pass `{ token }` as the third argument to `preloadQuery`
- Use `fetchQuery` when you need the value on the server but don't need client reactivity

---

## Pattern 3: Loading state handling

**Problem**: Treating `undefined` (loading) as empty data causes flash of empty UI.

**Solution**: Always distinguish between "loading" (`undefined`) and "loaded but empty" (empty array / null).

```tsx
function TaskList() {
  const tasks = useQuery(api.tasks.list)

  if (tasks === undefined) return <TaskListSkeleton />
  if (tasks.length === 0) return <EmptyState message="No tasks yet" />

  return (
    <ul>
      {tasks.map(task => <li key={task._id}>{task.title}</li>)}
    </ul>
  )
}
```

**Key rules**:
- `undefined` = still loading (show skeleton/spinner)
- `[]` or `null` = loaded, no results (show empty state)
- Once loaded, `useQuery` never returns `undefined` again for that subscription
- `undefined` is not a valid Convex return type; queries return actual values or null

---

## Pattern 4: Conditional queries with "skip"

**Problem**: Query arguments depend on state that might not exist yet. Hooks can't go inside conditionals.

**Solution**: Pass `"skip"` as the second argument to disable the query without breaking hook rules.

```tsx
function UserProfile({ userId }) {
  const user = useQuery(
    api.users.get,
    userId ? { id: userId } : "skip"
  )

  if (!userId) return <SignInPrompt />
  if (user === undefined) return <ProfileSkeleton />
  return <Profile user={user} />
}
```

**Common auth pattern**:

```tsx
function Dashboard() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const stats = useQuery(
    api.dashboard.getStats,
    isAuthenticated ? {} : "skip"
  )

  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <SignInPrompt />
  if (stats === undefined) return <DashboardSkeleton />
  return <DashboardContent stats={stats} />
}
```

**Key rules**:
- `"skip"` prevents the hook from subscribing; returns `undefined` with no backend call
- Hook still executes (satisfies React's hook ordering rules)
- Use with `useConvexAuth()` to gate queries that require authentication

---

## Pattern 5: Optimistic updates

**Problem**: Even with fast Convex mutations, some interactions (toggles, sends) feel slow without instant feedback.

**Solution**: Chain `.withOptimisticUpdate()` onto `useMutation`.

```tsx
const sendMessage = useMutation(api.messages.send).withOptimisticUpdate(
  (localStore, args) => {
    const existing = localStore.getQuery(api.messages.list, {
      channel: args.channel,
    })
    if (existing) {
      localStore.setQuery(api.messages.list, { channel: args.channel }, [
        ...existing,
        {
          _id: crypto.randomUUID(),
          _creationTime: Date.now(),
          body: args.body,
          author: "me",
        },
      ])
    }
  }
)
```

**Key rules**:
- Optimistic updates run on invocation, rerun on local query changes, roll back on mutation completion
- Match the EXACT query function reference and arguments in `localStore.getQuery` / `localStore.setQuery`
- Only apply if the query is already loaded (check for existence first)
- Auto-rolled back if the mutation throws; no manual cleanup needed
- Use sparingly; Convex mutations are already fast. Save for high-frequency interactions.

---

## Pattern 6: Auth gating with Convex

**Problem**: Auth provider says user is logged in, but Convex hasn't validated the JWT yet. Queries fail.

**Solution**: Use components and hooks from `convex/react` to gate on Convex auth readiness.

```tsx
import {
  Authenticated,
  Unauthenticated,
  AuthLoading,
} from "convex/react"

function App() {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AuthLoading><FullPageSpinner /></AuthLoading>
      <Authenticated><Dashboard /></Authenticated>
      <Unauthenticated><LandingPage /></Unauthenticated>
    </ConvexProviderWithClerk>
  )
}
```

**For server-side auth (Next.js)**:

```tsx
import { preloadQuery } from "convex/nextjs"

export async function ProtectedPage() {
  const token = await getAuthToken() // from your auth provider
  const data = await preloadQuery(api.dashboard.get, {}, { token })
  return <DashboardClient preloaded={data} />
}
```

**Key rules**:
- Use `useConvexAuth()` instead of `useAuth()` from Clerk/Auth0 to check Convex-specific auth state
- `<Authenticated>` guarantees child components can make authenticated Convex requests
- Always pass `{ token }` to `preloadQuery` / `fetchQuery` for server-side authenticated access
- `ctx.auth.getUserIdentity()` returns `null` if no valid token is present

---

## Pattern 7: Argument validation

**Problem**: Public Convex functions can be called by anyone. TypeScript types don't exist at runtime.

**Solution**: Always add `args` with `v` validators on public functions.

```tsx
import { mutation } from "./_generated/server"
import { v } from "convex/values"

export const create = mutation({
  args: {
    title: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return await ctx.db.insert("tasks", {
      ...args,
      userId: identity.subject,
      completed: false,
    })
  },
})
```

**Key rules**:
- Validators reject bad input BEFORE your handler runs
- Validated args give you TypeScript types automatically in the handler
- Use `internalMutation` / `internalQuery` / `internalAction` for functions only called by other Convex functions
- Internal functions don't need strict validation (they're not publicly accessible)
- Use `v.object()`, `v.array()`, `v.union()`, `v.literal()`, `v.id("tableName")` for complex types
- Share validators between functions and schemas with `const myValidator = v.object({...})`

---

## Pattern 8: Error handling

**Problem**: Mutation errors surface at the call site. Unhandled, they crash the app or silently fail.

**Solution**: Use `ConvexError` for expected failures. Catch at the call site. Wrap in error boundaries for queries.

**Server side**:
```tsx
import { ConvexError } from "convex/values"

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const existing = await ctx.db
      .query("tasks")
      .filter(q => q.eq(q.field("title"), title))
      .first()
    if (existing) {
      throw new ConvexError({ message: "Duplicate title", code: "DUPLICATE" })
    }
    return await ctx.db.insert("tasks", { title, completed: false })
  },
})
```

**Client side**:
```tsx
import { ConvexError } from "convex/values"

const handleSubmit = async (data) => {
  try {
    await createTask(data)
  } catch (error) {
    if (error instanceof ConvexError) {
      toast.error(error.data.message) // structured application error
    } else {
      toast.error("Something went wrong")
    }
  }
}
```

**Key rules**:
- Convex auto-retries internal/transient errors; you handle application errors
- Query errors forward to the `useQuery` call site; use React error boundaries
- In dev: full error message + stack trace sent to browser console
- In production: errors are redacted to "Server Error" (no implementation details leak)
- Set up exception reporting and log streaming for production visibility
- `useMutation` returns a promise; always handle or catch rejections

---

## Anti-patterns to avoid

| Anti-pattern | Why it's bad | What to do instead |
|---|---|---|
| `useQuery(api.foo, someCondition ? args : undefined)` | Passing `undefined` args causes runtime error | Use `"skip"`: `useQuery(api.foo, condition ? args : "skip")` |
| Using `useAuth()` from Clerk to gate Convex queries | Clerk auth may resolve before Convex validates the JWT | Use `useConvexAuth()` or `<Authenticated>` from convex/react |
| Calling `ctx.runQuery` / `ctx.runMutation` inside queries/mutations | Unnecessary overhead; not transactional | Use plain TypeScript helper functions instead |
| Mutations without `args` validators | Clients can pass any value; types don't exist at runtime | Always add `args: { ... }` with `v` validators |
| Using `useEffect` to fetch Convex data | Bypasses the reactive subscription; data goes stale | Use `useQuery` which auto-subscribes and stays current |
| Multiple `preloadQuery` calls expecting consistency | Each call is independent and stateless | Combine into a single query that returns all needed data |
| Optimistic updates on every mutation | Adds complexity with minimal benefit for most writes | Only use for high-frequency interactions where 100ms matters |

---

## Dependencies

- `convex` - Core Convex client and React hooks
- `convex/react` - `useQuery`, `useMutation`, `useAction`, `useConvexAuth`, `Authenticated`, etc.
- `convex/nextjs` - `preloadQuery`, `fetchQuery`, `fetchMutation` for Next.js server rendering
- `convex/values` - `v` validators and `ConvexError`
