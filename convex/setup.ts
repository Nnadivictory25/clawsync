import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Setup Functions
 *
 * Handles first-run setup wizard for new ClawSync installations.
 * Creates initial agentConfig and seeds required data.
 */

// Check if setup is needed (no agentConfig exists)
export const isRequired = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query('agentConfig').first();
    return config === null;
  },
});

// Complete the setup wizard
export const complete = mutation({
  args: {
    name: v.string(),
    soulDocument: v.string(),
    model: v.string(),
    modelProvider: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already set up
    const existing = await ctx.db.query('agentConfig').first();
    if (existing) {
      throw new Error('Setup already completed');
    }

    const now = Date.now();

    // Create agent config
    await ctx.db.insert('agentConfig', {
      name: args.name,
      soulDocument: args.soulDocument,
      systemPrompt: `You are ${args.name}. Follow the guidance in your soul document to shape your responses.`,
      model: args.model,
      modelProvider: args.modelProvider,
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
      updatedAt: now,
    });

    // Seed model providers
    const providers = [
      {
        providerId: 'anthropic',
        displayName: 'Anthropic',
        baseUrl: 'https://api.anthropic.com',
        apiKeyEnvVar: 'ANTHROPIC_API_KEY',
        enabled: true,
        rateLimitPerMinute: 60,
      },
      {
        providerId: 'openai',
        displayName: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        enabled: true,
        rateLimitPerMinute: 60,
      },
      {
        providerId: 'xai',
        displayName: 'xAI (Grok)',
        baseUrl: 'https://api.x.ai/v1',
        apiKeyEnvVar: 'XAI_API_KEY',
        enabled: true,
        rateLimitPerMinute: 60,
      },
      {
        providerId: 'openrouter',
        displayName: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKeyEnvVar: 'OPENROUTER_API_KEY',
        enabled: true,
        rateLimitPerMinute: 60,
      },
    ];

    for (const provider of providers) {
      const exists = await ctx.db
        .query('modelProviders')
        .withIndex('by_provider', (q) => q.eq('providerId', provider.providerId))
        .first();

      if (!exists) {
        await ctx.db.insert('modelProviders', {
          ...provider,
          updatedAt: now,
        });
      }
    }

    // Seed rate limit configs
    const rateLimits = [
      { scope: 'publicChat', maxRequests: 10, windowMs: 60000 },
      { scope: 'channelUser', maxRequests: 20, windowMs: 60000 },
      { scope: 'skillInvocation', maxRequests: 30, windowMs: 60000 },
      { scope: 'globalMessages', maxRequests: 200, windowMs: 60000 },
    ];

    for (const limit of rateLimits) {
      const exists = await ctx.db
        .query('rateLimitConfig')
        .withIndex('by_scope', (q) => q.eq('scope', limit.scope))
        .first();

      if (!exists) {
        await ctx.db.insert('rateLimitConfig', {
          ...limit,
          updatedAt: now,
        });
      }
    }

    // Seed default skill templates
    const templates = [
      {
        templateId: 'calculator',
        name: 'Calculator',
        description: 'Perform mathematical calculations',
        category: 'utility',
        configSchema: JSON.stringify({ type: 'object', properties: {} }),
        inputSchema: JSON.stringify({
          type: 'object',
          required: ['expression'],
          properties: {
            expression: { type: 'string', description: 'Mathematical expression to evaluate' },
          },
        }),
        outputDescription: 'Calculated result',
        supportsImages: false,
        version: '1.0.0',
      },
      {
        templateId: 'api-caller',
        name: 'API Caller',
        description: 'Call any REST API and return the response',
        category: 'integration',
        configSchema: JSON.stringify({
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', description: 'API endpoint URL' },
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Data to send to the API' },
          },
        }),
        outputDescription: 'API response body',
        supportsImages: false,
        version: '1.0.0',
      },
    ];

    for (const template of templates) {
      const exists = await ctx.db
        .query('skillTemplates')
        .withIndex('by_templateId', (q) => q.eq('templateId', template.templateId))
        .first();

      if (!exists) {
        await ctx.db.insert('skillTemplates', template);
      }
    }

    // Log setup completion
    await ctx.db.insert('activityLog', {
      actionType: 'setup_complete',
      summary: `Initial setup completed for "${args.name}"`,
      visibility: 'private',
      timestamp: now,
    });

    return { success: true };
  },
});
