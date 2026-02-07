import { query, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * API Usage Tracking
 *
 * Token usage dashboard inspired by OpenClaw v2026.2.6.
 * Tracks all API calls, token usage, and provides analytics.
 */

// Log API usage (internal)
export const log = internalMutation({
  args: {
    apiKeyId: v.id('apiKeys'),
    endpoint: v.string(),
    method: v.string(),
    statusCode: v.number(),
    tokensUsed: v.optional(v.number()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    durationMs: v.number(),
    requestSize: v.optional(v.number()),
    responseSize: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('apiUsage', {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Get usage for an API key (paginated)
export const listByKey = query({
  args: {
    apiKeyId: v.id('apiKeys'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiUsage')
      .withIndex('by_apiKey', (q) => q.eq('apiKeyId', args.apiKeyId))
      .order('desc')
      .take(args.limit ?? 100);
  },
});

// Get recent usage across all keys
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiUsage')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

// Get usage by endpoint
export const listByEndpoint = query({
  args: {
    endpoint: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('apiUsage')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .order('desc')
      .take(args.limit ?? 100);
  },
});

// Get usage summary for dashboard
export const getSummary = query({
  args: {
    apiKeyId: v.optional(v.id('apiKeys')),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get recent usage
    let usageQuery = ctx.db.query('apiUsage').withIndex('by_timestamp');

    const usage = await usageQuery
      .filter((q) => q.gte(q.field('timestamp'), cutoff))
      .take(10000);

    // Filter by API key if specified
    const filtered = args.apiKeyId
      ? usage.filter((u) => u.apiKeyId === args.apiKeyId)
      : usage;

    // Calculate summary
    const totalRequests = filtered.length;
    const successfulRequests = filtered.filter((u) => u.statusCode >= 200 && u.statusCode < 300).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalTokens = filtered.reduce((sum, u) => sum + (u.tokensUsed ?? 0), 0);
    const totalInputTokens = filtered.reduce((sum, u) => sum + (u.inputTokens ?? 0), 0);
    const totalOutputTokens = filtered.reduce((sum, u) => sum + (u.outputTokens ?? 0), 0);
    const avgDurationMs = totalRequests > 0
      ? filtered.reduce((sum, u) => sum + u.durationMs, 0) / totalRequests
      : 0;

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    for (const u of filtered) {
      byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] ?? 0) + 1;
    }

    // Group by day
    const byDay: Record<string, { requests: number; tokens: number }> = {};
    for (const u of filtered) {
      const day = new Date(u.timestamp).toISOString().split('T')[0];
      if (!byDay[day]) {
        byDay[day] = { requests: 0, tokens: 0 };
      }
      byDay[day].requests++;
      byDay[day].tokens += u.tokensUsed ?? 0;
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      avgDurationMs: Math.round(avgDurationMs),
      byEndpoint,
      byDay,
      period: { days, from: cutoff, to: Date.now() },
    };
  },
});

// Aggregate usage into summary table (called by cron)
export const aggregate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const dayStart = new Date(today).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    // Get all usage for today
    const usage = await ctx.db
      .query('apiUsage')
      .withIndex('by_timestamp')
      .filter((q) =>
        q.and(
          q.gte(q.field('timestamp'), dayStart),
          q.lt(q.field('timestamp'), dayEnd)
        )
      )
      .take(10000);

    // Group by API key
    const byKey: Record<string, {
      total: number;
      success: number;
      failed: number;
      tokens: number;
      inputTokens: number;
      outputTokens: number;
      totalDuration: number;
    }> = {};

    for (const u of usage) {
      const keyId = u.apiKeyId;
      if (!byKey[keyId]) {
        byKey[keyId] = {
          total: 0,
          success: 0,
          failed: 0,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalDuration: 0,
        };
      }

      byKey[keyId].total++;
      if (u.statusCode >= 200 && u.statusCode < 300) {
        byKey[keyId].success++;
      } else {
        byKey[keyId].failed++;
      }
      byKey[keyId].tokens += u.tokensUsed ?? 0;
      byKey[keyId].inputTokens += u.inputTokens ?? 0;
      byKey[keyId].outputTokens += u.outputTokens ?? 0;
      byKey[keyId].totalDuration += u.durationMs;
    }

    // Update or create summary records
    for (const [keyId, stats] of Object.entries(byKey)) {
      const existing = await ctx.db
        .query('apiUsageSummary')
        .withIndex('by_apiKey_date', (q) =>
          q.eq('apiKeyId', keyId as any).eq('date', today)
        )
        .first();

      const avgDurationMs = stats.total > 0 ? stats.totalDuration / stats.total : 0;

      if (existing) {
        await ctx.db.patch(existing._id, {
          totalRequests: stats.total,
          successfulRequests: stats.success,
          failedRequests: stats.failed,
          totalTokens: stats.tokens,
          totalInputTokens: stats.inputTokens,
          totalOutputTokens: stats.outputTokens,
          avgDurationMs: Math.round(avgDurationMs),
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert('apiUsageSummary', {
          apiKeyId: keyId as any,
          date: today,
          totalRequests: stats.total,
          successfulRequests: stats.success,
          failedRequests: stats.failed,
          totalTokens: stats.tokens,
          totalInputTokens: stats.inputTokens,
          totalOutputTokens: stats.outputTokens,
          avgDurationMs: Math.round(avgDurationMs),
          updatedAt: Date.now(),
        });
      }
    }

    return { processed: Object.keys(byKey).length, date: today };
  },
});

// Get daily summaries for an API key
export const getDailySummaries = query({
  args: {
    apiKeyId: v.id('apiKeys'),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.days ?? 30;

    return await ctx.db
      .query('apiUsageSummary')
      .withIndex('by_apiKey_date', (q) => q.eq('apiKeyId', args.apiKeyId))
      .order('desc')
      .take(limit);
  },
});

// Get usage summary for a specific API key (internal - for API)
export const getSummaryForKey = internalQuery({
  args: {
    apiKeyId: v.id('apiKeys'),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days ?? 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get recent usage for this key
    const usage = await ctx.db
      .query('apiUsage')
      .withIndex('by_apiKey', (q) => q.eq('apiKeyId', args.apiKeyId))
      .filter((q) => q.gte(q.field('timestamp'), cutoff))
      .take(10000);

    // Calculate summary
    const totalRequests = usage.length;
    const successfulRequests = usage.filter((u) => u.statusCode >= 200 && u.statusCode < 300).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalTokens = usage.reduce((sum, u) => sum + (u.tokensUsed ?? 0), 0);
    const totalInputTokens = usage.reduce((sum, u) => sum + (u.inputTokens ?? 0), 0);
    const totalOutputTokens = usage.reduce((sum, u) => sum + (u.outputTokens ?? 0), 0);
    const avgDurationMs = totalRequests > 0
      ? usage.reduce((sum, u) => sum + u.durationMs, 0) / totalRequests
      : 0;

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    for (const u of usage) {
      byEndpoint[u.endpoint] = (byEndpoint[u.endpoint] ?? 0) + 1;
    }

    // Group by day
    const byDay: Record<string, { requests: number; tokens: number }> = {};
    for (const u of usage) {
      const day = new Date(u.timestamp).toISOString().split('T')[0];
      if (!byDay[day]) {
        byDay[day] = { requests: 0, tokens: 0 };
      }
      byDay[day].requests++;
      byDay[day].tokens += u.tokensUsed ?? 0;
    }

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      avgDurationMs: Math.round(avgDurationMs),
      byEndpoint,
      byDay,
      period: { days, from: cutoff, to: Date.now() },
    };
  },
});

// Cleanup old usage logs (called by cron)
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Keep 30 days of detailed logs
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query('apiUsage')
      .withIndex('by_timestamp')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(1000);

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }

    return { deleted: oldLogs.length };
  },
});
