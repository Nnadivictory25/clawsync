import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

/**
 * User Preferences
 * 
 * Store user settings like email, telegram chat ID, etc.
 * For single-user setup.
 */

// Get user preferences (singleton - only one record)
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('userPreferences').first();
  },
});

// Get user's email
export const getEmail = query({
  args: {},
  handler: async (ctx) => {
    const prefs = await ctx.db.query('userPreferences').first();
    return prefs?.email || null;
  },
});

// Update user preferences
export const update = mutation({
  args: {
    email: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('userPreferences').first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert('userPreferences', {
        ...args,
        updatedAt: Date.now(),
      });
    }
  },
});

// Set email address
export const setEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('userPreferences').first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('userPreferences', {
        email: args.email,
        updatedAt: Date.now(),
      });
    }
    
    return { success: true, email: args.email };
  },
});

// Set Telegram chat ID
export const setTelegramChatId = mutation({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('userPreferences').first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        telegramChatId: args.chatId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('userPreferences', {
        telegramChatId: args.chatId,
        updatedAt: Date.now(),
      });
    }
    
    return { success: true, chatId: args.chatId };
  },
});
