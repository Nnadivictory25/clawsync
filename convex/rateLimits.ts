import { RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';
import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Rate Limiter Configuration
 *
 * Uses @convex-dev/rate-limiter component for built-in sharding.
 * All rate limits are defined here and used throughout the app.
 */

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Public chat - per session
  publicChat: {
    kind: 'token bucket',
    rate: 10,
    period: 60_000,
    capacity: 10,
  },
  // Channel user - per user
  channelUser: {
    kind: 'token bucket',
    rate: 20,
    period: 60_000,
    capacity: 20,
  },
  // Skill invocation - per skill
  skillInvocation: {
    kind: 'token bucket',
    rate: 30,
    period: 60_000,
    capacity: 30,
  },
  // Webhook skill - global
  webhookSkill: {
    kind: 'token bucket',
    rate: 100,
    period: 60_000,
    capacity: 100,
  },
  // MCP tool call - per server
  mcpTool: {
    kind: 'token bucket',
    rate: 50,
    period: 60_000,
    capacity: 50,
  },
  // Voice session - per session (5 min/hour)
  voiceSession: {
    kind: 'token bucket',
    rate: 5,
    period: 3600_000,
    capacity: 5,
  },
  // Global - all users
  globalMessages: {
    kind: 'token bucket',
    rate: 200,
    period: 60_000,
    capacity: 200,
  },
});

// Get all rate limit configs
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('rateLimitConfig').take(50);
  },
});

// Get rate limit config by scope
export const getByScope = query({
  args: { scope: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('rateLimitConfig')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();
  },
});

// Update rate limit config
export const update = mutation({
  args: {
    scope: v.string(),
    maxRequests: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('rateLimitConfig')
      .withIndex('by_scope', (q) => q.eq('scope', args.scope))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        maxRequests: args.maxRequests,
        windowMs: args.windowMs,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert('rateLimitConfig', {
      scope: args.scope,
      maxRequests: args.maxRequests,
      windowMs: args.windowMs,
      updatedAt: Date.now(),
    });
  },
});

// Seed default rate limit configs
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults = [
      { scope: 'publicChat', maxRequests: 10, windowMs: 60_000 },
      { scope: 'channelUser', maxRequests: 20, windowMs: 60_000 },
      { scope: 'skillInvocation', maxRequests: 30, windowMs: 60_000 },
      { scope: 'webhookSkill', maxRequests: 100, windowMs: 60_000 },
      { scope: 'mcpTool', maxRequests: 50, windowMs: 60_000 },
      { scope: 'voiceSession', maxRequests: 5, windowMs: 3600_000 },
      { scope: 'globalMessages', maxRequests: 200, windowMs: 60_000 },
    ];

    for (const config of defaults) {
      const existing = await ctx.db
        .query('rateLimitConfig')
        .withIndex('by_scope', (q) => q.eq('scope', config.scope))
        .first();

      if (!existing) {
        await ctx.db.insert('rateLimitConfig', {
          ...config,
          updatedAt: Date.now(),
        });
      }
    }
  },
});
