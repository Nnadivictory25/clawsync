import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Skill Registry
 *
 * Manages all three types of skills:
 * - template: No-code skills using built-in templates
 * - webhook: No-code skills that call external APIs
 * - code: TypeScript skills defined in the codebase
 */

// Get all skills
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('skillRegistry')
      .order('desc')
      .take(100);
  },
});

// Get active and approved skills (for tool loading)
export const getActiveApproved = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('skillRegistry')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .filter((q) => q.eq(q.field('approved'), true))
      .take(100);
  },
});

// Get skill by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillRegistry')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();
  },
});

// Get skill by ID
export const get = query({
  args: { id: v.id('skillRegistry') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new skill
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    skillType: v.union(
      v.literal('template'),
      v.literal('webhook'),
      v.literal('code')
    ),
    templateId: v.optional(v.string()),
    config: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    rateLimitPerMinute: v.optional(v.number()),
    timeoutMs: v.optional(v.number()),
    supportsImages: v.optional(v.boolean()),
    supportsStreaming: v.optional(v.boolean()),
    uiMeta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name
    const existing = await ctx.db
      .query('skillRegistry')
      .withIndex('by_name', (q) => q.eq('name', args.name))
      .first();

    if (existing) {
      throw new Error(`Skill with name "${args.name}" already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert('skillRegistry', {
      name: args.name,
      description: args.description,
      skillType: args.skillType,
      templateId: args.templateId,
      config: args.config,
      status: 'pending', // Always start as pending
      permissions: args.permissions ?? [],
      rateLimitPerMinute: args.rateLimitPerMinute ?? 30,
      timeoutMs: args.timeoutMs ?? 30000,
      supportsImages: args.supportsImages ?? false,
      supportsStreaming: args.supportsStreaming ?? false,
      uiMeta: args.uiMeta,
      approved: false, // Always start unapproved
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a skill
export const update = mutation({
  args: {
    id: v.id('skillRegistry'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    config: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal('active'),
      v.literal('inactive'),
      v.literal('pending')
    )),
    permissions: v.optional(v.array(v.string())),
    rateLimitPerMinute: v.optional(v.number()),
    timeoutMs: v.optional(v.number()),
    supportsImages: v.optional(v.boolean()),
    supportsStreaming: v.optional(v.boolean()),
    uiMeta: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Approve a skill (owner only)
export const approve = mutation({
  args: { id: v.id('skillRegistry') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      approved: true,
      approvedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Reject/unapprove a skill
export const reject = mutation({
  args: { id: v.id('skillRegistry') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      approved: false,
      status: 'inactive',
      updatedAt: Date.now(),
    });
  },
});

// Delete a skill
export const remove = mutation({
  args: { id: v.id('skillRegistry') },
  handler: async (ctx, args) => {
    // Also delete associated secrets
    const secrets = await ctx.db
      .query('skillSecrets')
      .withIndex('by_skill', (q) => q.eq('skillId', args.id))
      .collect();

    for (const secret of secrets) {
      await ctx.db.delete(secret._id);
    }

    await ctx.db.delete(args.id);
  },
});
