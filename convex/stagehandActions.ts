'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal, components } from './_generated/api';
import { Id } from './_generated/dataModel';
import { Stagehand } from '@browserbasehq/convex-stagehand';
import { z } from 'zod';

/**
 * Stagehand browser automation actions (Node.js runtime).
 * Requires BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, MODEL_API_KEY.
 */

function getClient(): Stagehand {
  const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
  const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
  const modelApiKey = process.env.MODEL_API_KEY;

  if (!browserbaseApiKey || !browserbaseProjectId || !modelApiKey) {
    throw new Error(
      'Stagehand requires BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, and MODEL_API_KEY environment variables.'
    );
  }

  return new Stagehand(components.stagehand, {
    browserbaseApiKey,
    browserbaseProjectId,
    modelApiKey,
  });
}

// Extract structured data from a URL
export const extract = action({
  args: {
    url: v.string(),
    instruction: v.string(),
  },
  returns: v.object({
    jobId: v.id('stagehandJobs'),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const start = Date.now();
    const jobId: Id<"stagehandJobs"> = await ctx.runMutation(
      internal.stagehand.createJob,
      {
        jobType: 'extract' as const,
        url: args.url,
        instruction: args.instruction,
      }
    );

    try {
      const client = getClient();
      const data = await client.extract(ctx, {
        url: args.url,
        instruction: args.instruction,
        schema: z.record(z.unknown()),
      });

      const result = JSON.stringify(data);
      await ctx.runMutation(internal.stagehand.completeJob, {
        jobId,
        result,
        durationMs: Date.now() - start,
      });

      return { jobId: jobId as any, result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await ctx.runMutation(internal.stagehand.failJob, {
        jobId,
        errorMessage,
      });
      return { jobId: jobId as any, error: errorMessage };
    }
  },
});

// Perform a browser action
export const act = action({
  args: {
    url: v.string(),
    instruction: v.string(),
  },
  returns: v.object({
    jobId: v.id('stagehandJobs'),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const start = Date.now();
    const jobId: Id<"stagehandJobs"> = await ctx.runMutation(
      internal.stagehand.createJob,
      {
        jobType: 'act' as const,
        url: args.url,
        instruction: args.instruction,
      }
    );

    try {
      const client = getClient();
      const data = await client.act(ctx, {
        url: args.url,
        action: args.instruction,
      });

      const result = JSON.stringify(data);
      await ctx.runMutation(internal.stagehand.completeJob, {
        jobId,
        result,
        durationMs: Date.now() - start,
      });

      return { jobId: jobId as any, result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await ctx.runMutation(internal.stagehand.failJob, {
        jobId,
        errorMessage,
      });
      return { jobId: jobId as any, error: errorMessage };
    }
  },
});

// Observe available actions on a page
export const observe = action({
  args: {
    url: v.string(),
    instruction: v.string(),
  },
  returns: v.object({
    jobId: v.id('stagehandJobs'),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const start = Date.now();
    const jobId: Id<"stagehandJobs"> = await ctx.runMutation(
      internal.stagehand.createJob,
      {
        jobType: 'observe' as const,
        url: args.url,
        instruction: args.instruction,
      }
    );

    try {
      const client = getClient();
      const data = await client.observe(ctx, {
        url: args.url,
        instruction: args.instruction,
      });

      const result = JSON.stringify(data);
      await ctx.runMutation(internal.stagehand.completeJob, {
        jobId,
        result,
        durationMs: Date.now() - start,
      });

      return { jobId: jobId as any, result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await ctx.runMutation(internal.stagehand.failJob, {
        jobId,
        errorMessage,
      });
      return { jobId: jobId as any, error: errorMessage };
    }
  },
});

// Run an autonomous agent
export const runAgent = action({
  args: {
    url: v.string(),
    instruction: v.string(),
    maxSteps: v.optional(v.number()),
  },
  returns: v.object({
    jobId: v.id('stagehandJobs'),
    result: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const start = Date.now();
    const jobId: Id<"stagehandJobs"> = await ctx.runMutation(
      internal.stagehand.createJob,
      {
        jobType: 'agent' as const,
        url: args.url,
        instruction: args.instruction,
      }
    );

    try {
      const client = getClient();
      const data = await client.agent(ctx, {
        url: args.url,
        instruction: args.instruction,
        options: { maxSteps: args.maxSteps ?? 10 },
      });

      const result = JSON.stringify(data);
      await ctx.runMutation(internal.stagehand.completeJob, {
        jobId,
        result,
        durationMs: Date.now() - start,
      });

      return { jobId: jobId as any, result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await ctx.runMutation(internal.stagehand.failJob, {
        jobId,
        errorMessage,
      });
      return { jobId: jobId as any, error: errorMessage };
    }
  },
});
