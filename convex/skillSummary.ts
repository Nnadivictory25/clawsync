import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Skill Invocation Summary
 *
 * Cold table pattern: Dashboard reads come from here, not from
 * the hot skillInvocationLog table. A cron job aggregates data
 * from the log into this summary table.
 */

// Get summary for a specific skill
export const getBySkill = query({
  args: { skillName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillInvocationSummary')
      .withIndex('by_skill', (q) => q.eq('skillName', args.skillName))
      .first();
  },
});

// Get all summaries (for dashboard)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('skillInvocationSummary')
      .order('desc')
      .take(100);
  },
});

// Aggregate summaries from invocation log (called by cron)
export const aggregate = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all unique skill names from recent logs
    const recentLogs = await ctx.db
      .query('skillInvocationLog')
      .withIndex('by_timestamp')
      .order('desc')
      .take(1000);

    // Group by skill name
    const skillStats: Record<string, {
      total: number;
      success: number;
      failure: number;
      totalDuration: number;
      lastInvokedAt: number;
    }> = {};

    for (const log of recentLogs) {
      if (!skillStats[log.skillName]) {
        skillStats[log.skillName] = {
          total: 0,
          success: 0,
          failure: 0,
          totalDuration: 0,
          lastInvokedAt: 0,
        };
      }

      const stats = skillStats[log.skillName];
      stats.total++;
      if (log.success) {
        stats.success++;
      } else {
        stats.failure++;
      }
      stats.totalDuration += log.durationMs;
      stats.lastInvokedAt = Math.max(stats.lastInvokedAt, log.timestamp);
    }

    // Update or create summary records
    for (const [skillName, stats] of Object.entries(skillStats)) {
      const existing = await ctx.db
        .query('skillInvocationSummary')
        .withIndex('by_skill', (q) => q.eq('skillName', skillName))
        .first();

      const avgDurationMs = stats.total > 0 ? stats.totalDuration / stats.total : 0;

      if (existing) {
        await ctx.db.patch(existing._id, {
          totalInvocations: existing.totalInvocations + stats.total,
          successCount: existing.successCount + stats.success,
          failureCount: existing.failureCount + stats.failure,
          avgDurationMs: Math.round(avgDurationMs),
          lastInvokedAt: Math.max(existing.lastInvokedAt, stats.lastInvokedAt),
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('skillInvocationSummary', {
          skillName,
          totalInvocations: stats.total,
          successCount: stats.success,
          failureCount: stats.failure,
          avgDurationMs: Math.round(avgDurationMs),
          lastInvokedAt: stats.lastInvokedAt,
          updatedAt: Date.now(),
        });
      }
    }

    return { processed: Object.keys(skillStats).length };
  },
});
