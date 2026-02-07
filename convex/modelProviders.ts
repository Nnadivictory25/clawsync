import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Model Providers
 *
 * Configuration for AI model providers. API keys are stored as env var
 * references (never the actual keys).
 */

// Get all providers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('modelProviders').take(50);
  },
});

// Get provider by ID
export const getById = query({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('modelProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();
  },
});

// Get enabled providers
export const getEnabled = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('modelProviders')
      .filter((q) => q.eq(q.field('enabled'), true))
      .take(50);
  },
});

// Create or update a provider
export const upsert = mutation({
  args: {
    providerId: v.string(),
    displayName: v.string(),
    baseUrl: v.string(),
    apiKeyEnvVar: v.string(),
    enabled: v.optional(v.boolean()),
    rateLimitPerMinute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('modelProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        baseUrl: args.baseUrl,
        apiKeyEnvVar: args.apiKeyEnvVar,
        enabled: args.enabled ?? existing.enabled,
        rateLimitPerMinute: args.rateLimitPerMinute ?? existing.rateLimitPerMinute,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert('modelProviders', {
      providerId: args.providerId,
      displayName: args.displayName,
      baseUrl: args.baseUrl,
      apiKeyEnvVar: args.apiKeyEnvVar,
      enabled: args.enabled ?? true,
      rateLimitPerMinute: args.rateLimitPerMinute ?? 100,
      updatedAt: Date.now(),
    });
  },
});

// Toggle provider enabled status
export const toggle = mutation({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query('modelProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();

    if (!provider) throw new Error('Provider not found');

    await ctx.db.patch(provider._id, {
      enabled: !provider.enabled,
      updatedAt: Date.now(),
    });
  },
});

// Seed default providers
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const providers = [
      {
        providerId: 'anthropic',
        displayName: 'Anthropic',
        baseUrl: 'https://api.anthropic.com',
        apiKeyEnvVar: 'ANTHROPIC_API_KEY',
        enabled: true,
        rateLimitPerMinute: 100,
      },
      {
        providerId: 'openai',
        displayName: 'OpenAI',
        baseUrl: 'https://api.openai.com',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        enabled: false,
        rateLimitPerMinute: 100,
      },
      {
        providerId: 'openrouter',
        displayName: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKeyEnvVar: 'OPENROUTER_API_KEY',
        enabled: false,
        rateLimitPerMinute: 100,
      },
      {
        providerId: 'opencode-zen',
        displayName: 'OpenCode Zen',
        baseUrl: 'https://opencode.ai/zen/v1',
        apiKeyEnvVar: 'OPENCODE_ZEN_API_KEY',
        enabled: false,
        rateLimitPerMinute: 100,
      },
    ];

    for (const provider of providers) {
      const existing = await ctx.db
        .query('modelProviders')
        .withIndex('by_provider', (q) => q.eq('providerId', provider.providerId))
        .first();

      if (!existing) {
        await ctx.db.insert('modelProviders', {
          ...provider,
          updatedAt: Date.now(),
        });
      }
    }

    return { seeded: providers.length };
  },
});
