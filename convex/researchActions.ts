'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';

/**
 * Research Execution Actions (Node.js runtime)
 *
 * Orchestrates Stagehand, Firecrawl, X API, and external APIs
 * to gather and synthesize research findings.
 */

// Run competitive research
export const runCompetitiveResearch = action({
  args: {
    projectId: v.id('researchProjects'),
    targets: v.array(v.string()), // URLs or company names
  },
  returns: v.object({
    findingsCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.research.setProjectStatus, {
      id: args.projectId,
      status: 'running',
    });

    let findingsCount = 0;

    try {
      for (const target of args.targets) {
        // Use Firecrawl to scrape each target
        try {
          const { jobId } = await ctx.runMutation(
            api.firecrawl.scrape as any,
            { url: target, options: { formats: ['markdown', 'links'] } }
          );

          // Wait briefly for scrape to complete
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const content = await ctx.runQuery(
            api.firecrawl.getContent as any,
            { id: jobId }
          );

          if (content?.markdown) {
            await ctx.runMutation(internal.research.addFinding, {
              projectId: args.projectId,
              source: target,
              sourceType: 'scrape',
              title: content.metadata?.title ?? target,
              content: content.markdown.slice(0, 10000),
              metadata: JSON.stringify(content.metadata ?? {}),
            });
            findingsCount++;
          }
        } catch (err) {
          // Firecrawl may not be configured; continue with other targets
          console.warn(`Failed to scrape ${target}:`, err);
        }
      }

      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'completed',
      });
    } catch (error) {
      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'failed',
      });
      return {
        findingsCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { findingsCount };
  },
});

// Run topic research (web scraping + AI)
export const runTopicResearch = action({
  args: {
    projectId: v.id('researchProjects'),
    keywords: v.array(v.string()),
    urls: v.optional(v.array(v.string())),
  },
  returns: v.object({
    findingsCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.research.setProjectStatus, {
      id: args.projectId,
      status: 'running',
    });

    let findingsCount = 0;

    try {
      const urls = args.urls ?? [];

      for (const url of urls) {
        try {
          const { jobId } = await ctx.runMutation(
            api.firecrawl.scrape as any,
            { url, options: { formats: ['markdown'] } }
          );

          await new Promise((resolve) => setTimeout(resolve, 5000));

          const content = await ctx.runQuery(
            api.firecrawl.getContent as any,
            { id: jobId }
          );

          if (content?.markdown) {
            await ctx.runMutation(internal.research.addFinding, {
              projectId: args.projectId,
              source: url,
              sourceType: 'web',
              title: content.metadata?.title ?? url,
              content: content.markdown.slice(0, 10000),
            });
            findingsCount++;
          }
        } catch (err) {
          console.warn(`Failed to scrape ${url}:`, err);
        }
      }

      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'completed',
      });
    } catch (error) {
      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'failed',
      });
      return {
        findingsCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { findingsCount };
  },
});

// Run real-time research from X/Twitter
export const runRealtimeResearch = action({
  args: {
    projectId: v.id('researchProjects'),
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  returns: v.object({
    findingsCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.research.setProjectStatus, {
      id: args.projectId,
      status: 'running',
    });

    let findingsCount = 0;

    try {
      // Use X API to search recent tweets
      const searchResult = await ctx.runAction(
        api.xTwitterActions.searchRecentTweets as any,
        {
          query: args.query,
          maxResults: args.maxResults ?? 20,
        }
      );

      if (searchResult?.data) {
        for (const tweet of searchResult.data) {
          await ctx.runMutation(internal.research.addFinding, {
            projectId: args.projectId,
            source: `https://x.com/i/status/${tweet.id}`,
            sourceType: 'twitter',
            content: tweet.text,
            metadata: JSON.stringify({
              tweetId: tweet.id,
              authorId: tweet.author_id,
              metrics: tweet.public_metrics,
            }),
          });
          findingsCount++;
        }
      }

      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'completed',
      });
    } catch (error) {
      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'failed',
      });
      return {
        findingsCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { findingsCount };
  },
});

// Run API-based research from external sources
export const runApiResearch = action({
  args: {
    projectId: v.id('researchProjects'),
    sourceConfigs: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        headers: v.optional(v.string()), // JSON headers
      })
    ),
  },
  returns: v.object({
    findingsCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.research.setProjectStatus, {
      id: args.projectId,
      status: 'running',
    });

    let findingsCount = 0;

    try {
      for (const source of args.sourceConfigs) {
        try {
          const headers: Record<string, string> = source.headers
            ? JSON.parse(source.headers)
            : {};

          const response = await fetch(source.url, { headers });
          if (!response.ok) continue;

          const data = await response.text();
          await ctx.runMutation(internal.research.addFinding, {
            projectId: args.projectId,
            source: source.name,
            sourceType: 'api',
            title: `API: ${source.name}`,
            content: data.slice(0, 20000),
            metadata: JSON.stringify({ url: source.url }),
          });
          findingsCount++;
        } catch (err) {
          console.warn(`Failed to fetch from ${source.name}:`, err);
        }
      }

      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'completed',
      });
    } catch (error) {
      await ctx.runMutation(internal.research.setProjectStatus, {
        id: args.projectId,
        status: 'failed',
      });
      return {
        findingsCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { findingsCount };
  },
});
