import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Voice Providers Management
 *
 * Manages voice provider configurations for TTS and STT.
 * Supports ElevenLabs and NVIDIA Personaplex.
 */

// List all voice providers
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('voiceProviders').collect();
  },
});

// Get a specific provider
export const get = query({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('voiceProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();
  },
});

// Get the default provider
export const getDefault = query({
  args: {},
  handler: async (ctx) => {
    const defaultProvider = await ctx.db
      .query('voiceProviders')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .first();

    if (!defaultProvider) {
      return await ctx.db
        .query('voiceProviders')
        .filter((q) => q.eq(q.field('enabled'), true))
        .first();
    }

    return defaultProvider;
  },
});

// Create or update a voice provider
export const upsert = mutation({
  args: {
    providerId: v.string(),
    displayName: v.string(),
    enabled: v.boolean(),
    isDefault: v.optional(v.boolean()),
    config: v.optional(v.string()),
    apiKeyEnvVar: v.string(),
    rateLimitPerMinute: v.optional(v.number()),
    maxSessionDurationSecs: v.optional(v.number()),
    supportsTTS: v.optional(v.boolean()),
    supportsSTT: v.optional(v.boolean()),
    supportsRealtime: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('voiceProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();

    // If setting as default, unset other defaults
    if (args.isDefault) {
      const allProviders = await ctx.db.query('voiceProviders').collect();
      for (const provider of allProviders) {
        if (provider.isDefault) {
          await ctx.db.patch(provider._id, { isDefault: false });
        }
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        enabled: args.enabled,
        isDefault: args.isDefault ?? existing.isDefault,
        config: args.config ?? existing.config,
        apiKeyEnvVar: args.apiKeyEnvVar,
        rateLimitPerMinute: args.rateLimitPerMinute ?? existing.rateLimitPerMinute,
        maxSessionDurationSecs: args.maxSessionDurationSecs ?? existing.maxSessionDurationSecs,
        supportsTTS: args.supportsTTS ?? existing.supportsTTS,
        supportsSTT: args.supportsSTT ?? existing.supportsSTT,
        supportsRealtime: args.supportsRealtime ?? existing.supportsRealtime,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert('voiceProviders', {
      providerId: args.providerId,
      displayName: args.displayName,
      enabled: args.enabled,
      isDefault: args.isDefault ?? false,
      config: args.config ?? '{}',
      apiKeyEnvVar: args.apiKeyEnvVar,
      rateLimitPerMinute: args.rateLimitPerMinute ?? 60,
      maxSessionDurationSecs: args.maxSessionDurationSecs ?? 600,
      supportsTTS: args.supportsTTS ?? true,
      supportsSTT: args.supportsSTT ?? false,
      supportsRealtime: args.supportsRealtime ?? false,
      updatedAt: Date.now(),
    });
  },
});

// Enable/disable a provider
export const setEnabled = mutation({
  args: {
    providerId: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query('voiceProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();

    if (!provider) {
      throw new Error(`Provider not found: ${args.providerId}`);
    }

    await ctx.db.patch(provider._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});

// Set default provider
export const setDefault = mutation({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    // Unset all defaults
    const allProviders = await ctx.db.query('voiceProviders').collect();
    for (const provider of allProviders) {
      if (provider.isDefault) {
        await ctx.db.patch(provider._id, { isDefault: false });
      }
    }

    // Set new default
    const provider = await ctx.db
      .query('voiceProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();

    if (!provider) {
      throw new Error(`Provider not found: ${args.providerId}`);
    }

    await ctx.db.patch(provider._id, {
      isDefault: true,
      updatedAt: Date.now(),
    });
  },
});

// Delete a provider
export const remove = mutation({
  args: { providerId: v.string() },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query('voiceProviders')
      .withIndex('by_provider', (q) => q.eq('providerId', args.providerId))
      .first();

    if (!provider) {
      throw new Error(`Provider not found: ${args.providerId}`);
    }

    await ctx.db.delete(provider._id);
  },
});

// Seed default providers
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const providers = [
      {
        providerId: 'elevenlabs',
        displayName: 'ElevenLabs',
        enabled: false,
        isDefault: true,
        config: JSON.stringify({
          defaultVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Rachel
          modelId: 'eleven_multilingual_v2',
          stability: 0.5,
          similarityBoost: 0.75,
        }),
        apiKeyEnvVar: 'ELEVENLABS_API_KEY',
        rateLimitPerMinute: 60,
        maxSessionDurationSecs: 600,
        supportsTTS: true,
        supportsSTT: false,
        supportsRealtime: false,
      },
      {
        providerId: 'personaplex',
        displayName: 'NVIDIA Personaplex',
        enabled: false,
        isDefault: false,
        config: JSON.stringify({
          baseUrl: 'https://api.nvidia.com/personaplex/v1',
          defaultVoiceId: 'default',
          sampleRate: 22050,
        }),
        apiKeyEnvVar: 'NVIDIA_API_KEY',
        rateLimitPerMinute: 60,
        maxSessionDurationSecs: 600,
        supportsTTS: true,
        supportsSTT: true,
        supportsRealtime: true,
      },
    ];

    for (const provider of providers) {
      const existing = await ctx.db
        .query('voiceProviders')
        .withIndex('by_provider', (q) => q.eq('providerId', provider.providerId))
        .first();

      if (!existing) {
        await ctx.db.insert('voiceProviders', {
          ...provider,
          updatedAt: Date.now(),
        });
      }
    }

    return { seeded: providers.length };
  },
});
