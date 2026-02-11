import { internalMutation, internalQuery, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Stagehand job storage (queries/mutations).
 * Actions live in stagehandActions.ts (Node.js runtime).
 */

// Internal: create a job record
export const createJob = internalMutation({
  args: {
    jobType: v.union(
      v.literal('extract'),
      v.literal('act'),
      v.literal('observe'),
      v.literal('agent')
    ),
    url: v.string(),
    instruction: v.string(),
  },
  returns: v.id('stagehandJobs'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('stagehandJobs', {
      jobType: args.jobType,
      url: args.url,
      instruction: args.instruction,
      status: 'running',
      createdAt: Date.now(),
    });
  },
});

// Internal: mark job completed
export const completeJob = internalMutation({
  args: {
    jobId: v.id('stagehandJobs'),
    result: v.string(),
    durationMs: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: 'completed',
      result: args.result,
      durationMs: args.durationMs,
      completedAt: Date.now(),
    });
    return null;
  },
});

// Internal: mark job failed
export const failJob = internalMutation({
  args: {
    jobId: v.id('stagehandJobs'),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: 'failed',
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    });
    return null;
  },
});

// Internal query for listing jobs
export const listJobsQuery = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('stagehandJobs')
      .withIndex('by_createdAt')
      .order('desc')
      .take(args.limit ?? 20);
  },
});

// Public query for listing jobs (frontend can subscribe)
export const listJobs = query({
  args: { limit: v.optional(v.number()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('stagehandJobs')
      .withIndex('by_createdAt')
      .order('desc')
      .take(args.limit ?? 20);
  },
});
