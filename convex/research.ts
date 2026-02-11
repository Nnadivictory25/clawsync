import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { v } from 'convex/values';

/**
 * Research Projects CRUD
 *
 * Manages research projects, findings, and external data sources.
 */

// ============================================
// Research Projects
// ============================================

export const createProject = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    researchType: v.union(
      v.literal('competitive'),
      v.literal('topic'),
      v.literal('realtime'),
      v.literal('api')
    ),
    config: v.optional(v.string()),
  },
  returns: v.id('researchProjects'),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('researchProjects', {
      title: args.title,
      description: args.description,
      researchType: args.researchType,
      status: 'draft',
      config: args.config,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateProject = mutation({
  args: {
    id: v.id('researchProjects'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed')
      )
    ),
    config: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) filtered[key] = val;
    }
    filtered.updatedAt = Date.now();
    await ctx.db.patch(id, filtered);
    return null;
  },
});

export const listProjects = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('running'),
        v.literal('completed'),
        v.literal('failed')
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const take = Math.min(args.limit ?? 50, 100); // Cap at 100
    if (args.status) {
      return await ctx.db
        .query('researchProjects')
        .withIndex('by_status', (q) => q.eq('status', args.status!))
        .order('desc')
        .take(take);
    }
    return await ctx.db
      .query('researchProjects')
      .withIndex('by_createdAt')
      .order('desc')
      .take(take);
  },
});

export const getProject = query({
  args: { id: v.id('researchProjects') },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const deleteProject = mutation({
  args: { id: v.id('researchProjects') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete all findings for this project
    const findings = await ctx.db
      .query('researchFindings')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect();
    await Promise.all(findings.map((f) => ctx.db.delete(f._id)));

    await ctx.db.delete(args.id);
    return null;
  },
});

// Internal: update project status (used by research actions)
export const setProjectStatus = internalMutation({
  args: {
    id: v.id('researchProjects'),
    status: v.union(
      v.literal('draft'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed')
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// ============================================
// Research Findings
// ============================================

export const addFinding = internalMutation({
  args: {
    projectId: v.id('researchProjects'),
    source: v.string(),
    sourceType: v.union(
      v.literal('web'),
      v.literal('twitter'),
      v.literal('api'),
      v.literal('scrape')
    ),
    title: v.optional(v.string()),
    content: v.string(),
    aiSummary: v.optional(v.string()),
    relevanceScore: v.optional(v.number()),
    metadata: v.optional(v.string()),
  },
  returns: v.id('researchFindings'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('researchFindings', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listFindings = query({
  args: {
    projectId: v.id('researchProjects'),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('researchFindings')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(Math.min(args.limit ?? 100, 200)); // Cap at 200
  },
});

// ============================================
// Research Sources (external APIs)
// ============================================

export const addSource = mutation({
  args: {
    name: v.string(),
    sourceType: v.union(
      v.literal('api'),
      v.literal('rss'),
      v.literal('twitter_search'),
      v.literal('website')
    ),
    config: v.string(),
  },
  returns: v.id('researchSources'),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert('researchSources', {
      name: args.name,
      sourceType: args.sourceType,
      config: args.config,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listSources = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query('researchSources').collect();
  },
});

export const removeSource = mutation({
  args: { id: v.id('researchSources') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Internal: get project by ID for actions
export const getProjectInternal = internalQuery({
  args: { id: v.id('researchProjects') },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
