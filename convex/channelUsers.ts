import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Channel Users
 *
 * Tracks users from messaging channels (Telegram, WhatsApp, Slack, Discord).
 * Maps platform IDs to internal thread IDs.
 */

// Get channel user by platform ID
export const getByPlatformId = query({
  args: {
    channelType: v.string(),
    platformId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('channelUsers')
      .withIndex('by_platform', (q) =>
        q.eq('channelType', args.channelType).eq('platformId', args.platformId)
      )
      .first();
  },
});

// List recent channel users
export const listRecent = query({
  args: {
    channelType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('channelUsers');

    if (args.channelType) {
      query = query.filter((q) => q.eq(q.field('channelType'), args.channelType));
    }

    return await query.order('desc').take(args.limit ?? 50);
  },
});

// Create or update a channel user
export const upsert = mutation({
  args: {
    channelType: v.string(),
    platformId: v.string(),
    displayName: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('channelUsers')
      .withIndex('by_platform', (q) =>
        q.eq('channelType', args.channelType).eq('platformId', args.platformId)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName ?? existing.displayName,
        threadId: args.threadId ?? existing.threadId,
        lastActiveAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('channelUsers', {
      channelType: args.channelType,
      platformId: args.platformId,
      displayName: args.displayName,
      threadId: args.threadId,
      lastActiveAt: now,
      createdAt: now,
    });
  },
});

// Update last active timestamp
export const touch = mutation({
  args: {
    channelType: v.string(),
    platformId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('channelUsers')
      .withIndex('by_platform', (q) =>
        q.eq('channelType', args.channelType).eq('platformId', args.platformId)
      )
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        lastActiveAt: Date.now(),
      });
    }
  },
});
