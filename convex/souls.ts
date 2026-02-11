import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Soul Documents CRUD
 *
 * Shared soul documents that multiple agents can reference.
 * One soul can be used by many agents (many-to-one relationship).
 */

// List all souls
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('souls'),
      _creationTime: v.number(),
      name: v.string(),
      document: v.string(),
      systemPrompt: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query('souls').order('desc').collect();
  },
});

// Get a single soul by ID
export const get = query({
  args: { soulId: v.id('souls') },
  returns: v.union(
    v.object({
      _id: v.id('souls'),
      _creationTime: v.number(),
      name: v.string(),
      document: v.string(),
      systemPrompt: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.soulId);
  },
});

// Internal: get soul for backend use (actions)
export const getInternal = internalQuery({
  args: { soulId: v.id('souls') },
  returns: v.union(
    v.object({
      _id: v.id('souls'),
      _creationTime: v.number(),
      name: v.string(),
      document: v.string(),
      systemPrompt: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.soulId);
  },
});

// Create a new soul document
export const create = mutation({
  args: {
    name: v.string(),
    document: v.string(),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.id('souls'),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('souls', {
      name: args.name,
      document: args.document,
      systemPrompt: args.systemPrompt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a soul document
export const update = mutation({
  args: {
    soulId: v.id('souls'),
    name: v.optional(v.string()),
    document: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { soulId, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }
    await ctx.db.patch(soulId, patch);
    return null;
  },
});

// Delete a soul (fails if agents still reference it)
export const remove = mutation({
  args: { soulId: v.id('souls') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if any agents reference this soul
    const agents = await ctx.db.query('agents').collect();
    const referenced = agents.filter((a) => a.soulId === args.soulId);
    if (referenced.length > 0) {
      throw new Error(
        `Cannot delete: ${referenced.length} agent(s) still use this soul`
      );
    }
    await ctx.db.delete(args.soulId);
    return null;
  },
});

// List agents using a given soul
export const getAgents = query({
  args: { soulId: v.id('souls') },
  returns: v.array(
    v.object({
      _id: v.id('agents'),
      name: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const agents = await ctx.db.query('agents').collect();
    return agents
      .filter((a) => a.soulId === args.soulId)
      .map((a) => ({ _id: a._id, name: a.name }));
  },
});
