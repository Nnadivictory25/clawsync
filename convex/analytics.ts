import { internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Analytics Data Aggregation
 *
 * Queries that gather metrics from existing tables for AI analysis.
 * Used by analyticsReport.ts to build data snapshots.
 */

// Gather a metrics snapshot for AI analysis
export const getMetricsSnapshot = internalQuery({
  args: {},
  returns: v.string(), // JSON snapshot
  handler: async (ctx) => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // API usage (last 7 days)
    const apiUsage = await ctx.db
      .query('apiUsage')
      .withIndex('by_timestamp')
      .order('desc')
      .take(500);

    const recentApiUsage = apiUsage.filter((u) => u.timestamp > weekAgo);

    // API usage by endpoint
    const endpointCounts: Record<string, number> = {};
    const endpointTokens: Record<string, number> = {};
    for (const u of recentApiUsage) {
      endpointCounts[u.endpoint] = (endpointCounts[u.endpoint] ?? 0) + 1;
      endpointTokens[u.endpoint] =
        (endpointTokens[u.endpoint] ?? 0) + (u.tokensUsed ?? 0);
    }

    // Skill invocations (last 7 days)
    const skillLogs = await ctx.db
      .query('skillInvocationLog')
      .withIndex('by_timestamp')
      .order('desc')
      .take(500);

    const recentSkillLogs = skillLogs.filter((s) => s.timestamp > weekAgo);

    // Skill usage summary
    const skillCounts: Record<string, { total: number; success: number; avgMs: number }> = {};
    for (const s of recentSkillLogs) {
      if (!skillCounts[s.skillName]) {
        skillCounts[s.skillName] = { total: 0, success: 0, avgMs: 0 };
      }
      skillCounts[s.skillName].total += 1;
      if (s.success) skillCounts[s.skillName].success += 1;
      skillCounts[s.skillName].avgMs =
        (skillCounts[s.skillName].avgMs * (skillCounts[s.skillName].total - 1) +
          s.durationMs) /
        skillCounts[s.skillName].total;
    }

    // Activity log (last 7 days)
    const activities = await ctx.db
      .query('activityLog')
      .withIndex('by_visibility_timestamp')
      .order('desc')
      .take(200);

    const recentActivities = activities.filter((a) => a.timestamp > weekAgo);
    const activityByType: Record<string, number> = {};
    for (const a of recentActivities) {
      activityByType[a.actionType] = (activityByType[a.actionType] ?? 0) + 1;
    }

    // X/Twitter tweets (last 7 days)
    const tweets = await ctx.db
      .query('xTweets')
      .withIndex('by_postedAt')
      .order('desc')
      .take(50);

    const recentTweets = tweets.filter((t) => t.postedAt > weekAgo);
    const tweetStats = {
      total: recentTweets.length,
      agentTweets: recentTweets.filter((t) => t.isAgentTweet).length,
      totalLikes: recentTweets.reduce((acc, t) => acc + (t.likeCount ?? 0), 0),
      totalRetweets: recentTweets.reduce(
        (acc, t) => acc + (t.retweetCount ?? 0),
        0
      ),
    };

    // AgentMail messages (last 7 days)
    const mailMessages = await ctx.db
      .query('agentMailMessages')
      .withIndex('by_timestamp')
      .order('desc')
      .take(100);

    const recentMail = mailMessages.filter((m) => m.timestamp > weekAgo);

    // Token totals
    const totalTokens = recentApiUsage.reduce(
      (acc, u) => acc + (u.tokensUsed ?? 0),
      0
    );
    const totalInputTokens = recentApiUsage.reduce(
      (acc, u) => acc + (u.inputTokens ?? 0),
      0
    );
    const totalOutputTokens = recentApiUsage.reduce(
      (acc, u) => acc + (u.outputTokens ?? 0),
      0
    );

    const snapshot = {
      period: { start: weekAgo, end: now },
      apiUsage: {
        totalRequests: recentApiUsage.length,
        totalTokens,
        totalInputTokens,
        totalOutputTokens,
        byEndpoint: endpointCounts,
        tokensByEndpoint: endpointTokens,
      },
      skills: {
        totalInvocations: recentSkillLogs.length,
        bySkill: skillCounts,
      },
      activity: {
        totalActions: recentActivities.length,
        byType: activityByType,
      },
      twitter: tweetStats,
      email: {
        totalMessages: recentMail.length,
        inbound: recentMail.filter((m) => m.direction === 'inbound').length,
        outbound: recentMail.filter((m) => m.direction === 'outbound').length,
      },
    };

    return JSON.stringify(snapshot);
  },
});
