import { mutation, query, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Telegram Sessions
 *
 * Manages conversation history for Telegram bot users.
 * Maps Telegram chat IDs to Convex thread IDs for persistent conversations.
 */

// Get or create a session for a Telegram chat
export const getOrCreateSession = internalMutation({
  args: {
    chatId: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({
    sessionId: v.id('telegramSessions'),
    threadId: v.string(),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Check for existing session
    const existing = await ctx.db
      .query('telegramSessions')
      .withIndex('by_chatId', (q) => q.eq('chatId', args.chatId))
      .first();

    if (existing) {
      // Update last activity
      await ctx.db.patch(existing._id, {
        updatedAt: Date.now(),
      });

      return {
        sessionId: existing._id,
        threadId: existing.threadId,
        isNew: false,
      };
    }

    // Create new session (thread will be created on first message)
    const sessionId = await ctx.db.insert('telegramSessions', {
      chatId: args.chatId,
      threadId: '', // Will be set on first message
      username: args.username,
      firstName: args.firstName,
      lastName: args.lastName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      sessionId,
      threadId: '',
      isNew: true,
    };
  },
});

// Update the thread ID for a session
export const updateThreadId = internalMutation({
  args: {
    sessionId: v.id('telegramSessions'),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      threadId: args.threadId,
      updatedAt: Date.now(),
    });
  },
});

// Get session by chat ID
export const getByChatId = internalQuery({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('telegramSessions')
      .withIndex('by_chatId', (q) => q.eq('chatId', args.chatId))
      .first();
  },
});

// Reset session (for /start command)
export const resetSession = internalMutation({
  args: {
    chatId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('telegramSessions')
      .withIndex('by_chatId', (q) => q.eq('chatId', args.chatId))
      .first();

    if (session) {
      // Clear thread ID to start fresh conversation
      await ctx.db.patch(session._id, {
        threadId: '',
        updatedAt: Date.now(),
      });
      return true;
    }

    return false;
  },
});

// List all sessions (for admin)
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('telegramSessions')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

// Get recent sessions (most recently active first)
export const getRecentSessions = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id('telegramSessions'),
    chatId: v.string(),
    threadId: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('telegramSessions')
      .order('desc')
      .take(args.limit ?? 5);
  },
});

// Delete a session
export const remove = mutation({
  args: {
    sessionId: v.id('telegramSessions'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});
