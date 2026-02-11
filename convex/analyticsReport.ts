import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

/**
 * AI Analytics Report storage and retrieval.
 * The Node action for generating reports lives in analyticsReportAction.ts.
 */

// Internal: save report to database
export const saveReport = internalMutation({
  args: {
    reportType: v.union(v.literal('weekly'), v.literal('manual')),
    title: v.string(),
    summary: v.string(),
    sections: v.string(),
    anomalies: v.string(),
    recommendations: v.string(),
    dataSnapshot: v.string(),
    model: v.string(),
  },
  returns: v.id('aiAnalyticsReports'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('aiAnalyticsReports', {
      ...args,
      generatedAt: Date.now(),
    });
  },
});

// List reports (newest first)
export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const take = Math.min(args.limit ?? 20, 50); // Cap at 50
    return await ctx.db
      .query('aiAnalyticsReports')
      .withIndex('by_generatedAt')
      .order('desc')
      .take(take);
  },
});

// Get latest report
export const getLatest = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query('aiAnalyticsReports')
      .withIndex('by_generatedAt')
      .order('desc')
      .first();
  },
});

// Trigger manual report generation
export const triggerManual = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.analyticsReportAction.generate,
      { reportType: 'manual' as const }
    );
    return null;
  },
});
