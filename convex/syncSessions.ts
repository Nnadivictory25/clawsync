import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * OpenSync Session Management
 *
 * Handles cross-device session continuity via OpenSync (opensync.dev).
 * If a user starts a chat on mobile and switches to desktop, the thread continues.
 */

// Get session by token
export const getByToken = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('syncSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
  },
});

// Get sessions by user
export const listByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('syncSessions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(10);
  },
});

// Create or update a session
export const upsert = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.optional(v.string()),
    threadId: v.string(),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('syncSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId ?? existing.userId,
        threadId: args.threadId,
        deviceInfo: args.deviceInfo ?? existing.deviceInfo,
        lastActiveAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('syncSessions', {
      sessionToken: args.sessionToken,
      userId: args.userId,
      threadId: args.threadId,
      deviceInfo: args.deviceInfo,
      lastActiveAt: now,
      createdAt: now,
    });
  },
});

// Update last active timestamp
export const touch = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('syncSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        lastActiveAt: Date.now(),
      });
    }
  },
});

// Delete a session
export const remove = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('syncSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
