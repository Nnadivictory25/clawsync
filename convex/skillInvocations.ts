import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Skill Invocation Logging
 *
 * Audit trail for all skill executions.
 * Dashboard reads from skillInvocationSummary (cold table),
 * not directly from this log (hot table).
 */

// Log a skill invocation (internal only)
export const log = internalMutation({
  args: {
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
  },
  returns: v.id('skillInvocationLog'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('skillInvocationLog', args);
  },
});

// Get recent invocations for a skill (paginated)
export const listBySkill = query({
  args: {
    skillName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillInvocationLog')
      .withIndex('by_skill', (q) => q.eq('skillName', args.skillName))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Get recent invocations (all skills, paginated)
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillInvocationLog')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Get security failures
export const listSecurityFailures = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillInvocationLog')
      .withIndex('by_security_result')
      .filter((q) => q.neq(q.field('securityCheckResult'), 'passed'))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Cleanup old logs (called by cron)
export const cleanup = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    // Keep 30 days of logs
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query('skillInvocationLog')
      .withIndex('by_timestamp')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(1000);

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }

    return { deleted: oldLogs.length };
  },
});
