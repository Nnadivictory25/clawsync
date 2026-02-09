import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Agent Configuration
 *
 * Stores the agent's identity, model settings, and UI config.
 * SyncBoard edits these values; the agent reads them at runtime.
 */

// Get the current agent config
export const get = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const config = await ctx.db.query('agentConfig').first();
    return config;
  },
});

// Internal query for agent to load config
export const getConfig = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query('agentConfig').first();
  },
});

// Internal query for API to get public config (no secrets)
export const getPublic = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query('agentConfig').first();
    if (!config) return null;

    // Return only public fields
    return {
      name: config.name,
      model: config.model,
      modelProvider: config.modelProvider,
      voiceEnabled: config.voiceEnabled,
      domainAllowlist: config.domainAllowlist,
      uiConfig: config.uiConfig,
    };
  },
});

// Update agent config
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    soulDocument: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    modelProvider: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    fallbackProvider: v.optional(v.string()),
    voiceEnabled: v.optional(v.boolean()),
    voiceId: v.optional(v.string()),
    domainAllowlist: v.optional(v.array(v.string())),
    uiConfig: v.optional(v.string()),
  },
  returns: v.id('agentConfig'),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('agentConfig').first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new config if none exists
    return await ctx.db.insert('agentConfig', {
      name: args.name ?? 'ClawSync Agent',
      soulDocument: args.soulDocument ?? '',
      systemPrompt: args.systemPrompt ?? '',
      model: args.model ?? 'gemini-2.5-pro',
      modelProvider: args.modelProvider ?? 'google',
      fallbackModel: args.fallbackModel,
      fallbackProvider: args.fallbackProvider,
      voiceEnabled: args.voiceEnabled ?? false,
      voiceId: args.voiceId,
      domainAllowlist: args.domainAllowlist ?? [],
      uiConfig: args.uiConfig ?? JSON.stringify({
        showActivityFeed: true,
        showVoiceToggle: false,
        showModelBadge: true,
        showSkillIndicators: true,
        showTypingIndicator: true,
        chatPlaceholder: 'Ask me anything...',
        maxMessageLength: 4000,
      }),
      updatedAt: Date.now(),
    });
  },
});

// Seed default config
export const seed = mutation({
  args: {
    soulDocument: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('agentConfig').first();
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert('agentConfig', {
      name: 'ClawSync Agent',
      soulDocument: args.soulDocument,
      systemPrompt: 'You are a helpful AI assistant.',
      model: 'claude-sonnet-4-20250514',
      modelProvider: 'anthropic',
      voiceEnabled: false,
      domainAllowlist: [],
      uiConfig: JSON.stringify({
        showActivityFeed: true,
        showVoiceToggle: false,
        showModelBadge: true,
        showSkillIndicators: true,
        showTypingIndicator: true,
        chatPlaceholder: 'Ask me anything...',
        maxMessageLength: 4000,
      }),
      updatedAt: Date.now(),
    });
  },
});
