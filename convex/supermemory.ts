import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Supermemory configuration queries/mutations.
 * Actions live in supermemoryActions.ts (Node.js runtime).
 */

// Get config (public)
export const getConfig = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query('supermemoryConfig').first();
  },
});

// Get config (internal, used by actions)
export const getConfigInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query('supermemoryConfig').first();
  },
});

// Update or create config
export const updateConfig = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    containerPrefix: v.optional(v.string()),
    relevanceThreshold: v.optional(v.number()),
    autoStoreConversations: v.optional(v.boolean()),
    autoInjectContext: v.optional(v.boolean()),
    maxMemoriesPerQuery: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('supermemoryConfig').first();
    const updates: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(args)) {
      if (val !== undefined) updates[key] = val;
    }
    updates.updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert('supermemoryConfig', {
        enabled: args.enabled ?? false,
        containerPrefix: args.containerPrefix ?? 'clawsync',
        relevanceThreshold: args.relevanceThreshold ?? 0.5,
        autoStoreConversations: args.autoStoreConversations ?? true,
        autoInjectContext: args.autoInjectContext ?? true,
        maxMemoriesPerQuery: args.maxMemoriesPerQuery ?? 5,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
