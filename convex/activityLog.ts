import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Activity Log
 *
 * Real-time log of agent actions. Owner controls visibility per entry.
 * Defaults to private.
 */

// Get public activity entries (for activity feed)
export const listPublic = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id('activityLog'),
    _creationTime: v.number(),
    actionType: v.string(),
    summary: v.string(),
    channel: v.optional(v.string()),
    visibility: v.union(v.literal('public'), v.literal('private')),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLog')
      .withIndex('by_visibility_timestamp', (q) => q.eq('visibility', 'public'))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Get all activity entries (for SyncBoard)
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLog')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

// Get activity by channel
export const listByChannel = query({
  args: {
    channel: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLog')
      .withIndex('by_channel', (q) => q.eq('channel', args.channel))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Log an activity (internal, supports optional agentId for multi-agent)
export const log = internalMutation({
  args: {
    actionType: v.string(),
    summary: v.string(),
    channel: v.optional(v.string()),
    agentId: v.optional(v.id('agents')),
    visibility: v.optional(v.union(v.literal('public'), v.literal('private'))),
    metadata: v.optional(v.string()),
  },
  returns: v.id('activityLog'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('activityLog', {
      actionType: args.actionType,
      summary: args.summary,
      channel: args.channel,
      agentId: args.agentId,
      visibility: args.visibility ?? 'private',
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// Update visibility of an activity entry
export const updateVisibility = mutation({
  args: {
    id: v.id('activityLog'),
    visibility: v.union(v.literal('public'), v.literal('private')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      visibility: args.visibility,
    });
    return null;
  },
});

// Delete an activity entry
export const remove = mutation({
  args: { id: v.id('activityLog') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// List activity entries for a specific agent
export const listByAgent = query({
  args: {
    agentId: v.id('agents'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLog')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .order('desc')
      .take(args.limit ?? 100);
  },
});

// Internal: List all activity (for authenticated API access)
export const listAll = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLog')
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// Internal: List public activity only (for unauthenticated API access)
export const listPublicOnly = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLog')
      .withIndex('by_visibility_timestamp', (q) => q.eq('visibility', 'public'))
      .order('desc')
      .take(args.limit ?? 50);
  },
});
