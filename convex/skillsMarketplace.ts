import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { v } from 'convex/values';

/**
 * Skills Marketplace queries and mutations.
 * The sync action (Node.js) lives in skillsMarketplaceActions.ts.
 */

// ============================================
// External Skill Sources
// ============================================

export const addSource = mutation({
  args: {
    name: v.string(),
    sourceType: v.union(
      v.literal('skills_directory'),
      v.literal('github_repo'),
      v.literal('custom_registry')
    ),
    url: v.string(),
    apiKey: v.optional(v.string()),
  },
  returns: v.id('externalSkillSources'),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('externalSkillSources', {
      name: args.name,
      sourceType: args.sourceType,
      url: args.url,
      apiKey: args.apiKey,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// List sources, stripping apiKey from response for security
export const listSources = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const sources = await ctx.db
      .query('externalSkillSources')
      .withIndex('by_enabled')
      .collect();
    // Never expose API keys to the client
    return sources.map(({ apiKey: _key, ...rest }) => rest);
  },
});

export const removeSource = mutation({
  args: { id: v.id('externalSkillSources') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const imported = await ctx.db
      .query('importedSkills')
      .withIndex('by_source', (q) => q.eq('sourceId', args.id))
      .collect();
    await Promise.all(imported.map((s) => ctx.db.delete(s._id)));
    await ctx.db.delete(args.id);
    return null;
  },
});

// ============================================
// Internal helpers for sync action
// ============================================

export const getSourceInternal = internalQuery({
  args: { id: v.id('externalSkillSources') },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const upsertImportedSkill = internalMutation({
  args: {
    sourceId: v.id('externalSkillSources'),
    externalId: v.string(),
    name: v.string(),
    description: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    version: v.optional(v.string()),
    author: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('importedSkills')
      .withIndex('by_externalId', (q) => q.eq('externalId', args.externalId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        content: args.content,
        category: args.category,
        version: args.version,
        author: args.author,
        sourceUrl: args.sourceUrl,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('importedSkills', {
        sourceId: args.sourceId,
        externalId: args.externalId,
        name: args.name,
        description: args.description,
        content: args.content,
        category: args.category,
        version: args.version,
        author: args.author,
        sourceUrl: args.sourceUrl,
        status: 'available',
        importedAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const updateSourceSync = internalMutation({
  args: {
    sourceId: v.id('externalSkillSources'),
    skillCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sourceId, {
      lastSyncedAt: Date.now(),
      skillCount: args.skillCount,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// Browse and Manage
// ============================================

export const listAvailable = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const take = Math.min(args.limit ?? 50, 100); // Cap at 100
    return await ctx.db
      .query('importedSkills')
      .withIndex('by_status', (q) => q.eq('status', 'available'))
      .take(take);
  },
});

export const listImported = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query('importedSkills').collect();
  },
});

export const activateSkill = mutation({
  args: { importedSkillId: v.id('importedSkills') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const imported = await ctx.db.get(args.importedSkillId);
    if (!imported) return null;
    if (imported.status === 'active') return null;

    const now = Date.now();
    const skillId = await ctx.db.insert('skillRegistry', {
      name: imported.name,
      description: imported.description,
      skillType: 'code',
      config: JSON.stringify({
        content: imported.content,
        source: 'marketplace',
      }),
      status: 'active',
      permissions: [],
      rateLimitPerMinute: 60,
      approved: true,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.importedSkillId, {
      status: 'active',
      skillRegistryId: skillId,
      updatedAt: now,
    });

    return null;
  },
});

export const deactivateSkill = mutation({
  args: { importedSkillId: v.id('importedSkills') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const imported = await ctx.db.get(args.importedSkillId);
    if (!imported) return null;
    if (imported.status !== 'active') return null;

    if (imported.skillRegistryId) {
      await ctx.db.delete(imported.skillRegistryId);
    }

    await ctx.db.patch(args.importedSkillId, {
      status: 'disabled',
      skillRegistryId: undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});
