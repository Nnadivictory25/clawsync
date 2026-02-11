import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Model Providers
 *
 * Configuration for AI model providers. API keys are stored as env var
 * references (never the actual keys).
 */

// Validator for provider documents
const providerValidator = v.object({
  _id: v.id('modelProviders'),
  _creationTime: v.number(),
  providerId: v.string(),
  displayName: v.string(),
  baseUrl: v.string(),
  apiKeyEnvVar: v.string(),
  enabled: v.boolean(),
  rateLimitPerMinute: v.number(),
  updatedAt: v.number(),
});

// Get all providers
export const list = query({
  args: {},
  returns: v.array(providerValidator),
  handler: async (ctx) => {
    return await ctx.db.query('modelProviders').take(50);
  },
});

// Get provider by ID
export const getById = query({
  args: { providerId: v.string() },
  returns: v.union(providerValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('modelProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();
  },
});

// Get enabled providers (uses index instead of .filter())
export const getEnabled = query({
  args: {},
  returns: v.array(providerValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query('modelProviders')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
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
  returns: v.id('modelProviders'),
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
  returns: v.null(),
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
    return null;
  },
});

// Seed default providers (including xAI)
export const seed = mutation({
  args: {},
  returns: v.object({ seeded: v.number() }),
  handler: async (ctx) => {
    const providers = [
      {
        providerId: 'google',
        displayName: 'Google (Gemini)',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
        enabled: true,
        rateLimitPerMinute: 300,
      },
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
        providerId: 'xai',
        displayName: 'xAI',
        baseUrl: 'https://api.x.ai/v1',
        apiKeyEnvVar: 'XAI_API_KEY',
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
