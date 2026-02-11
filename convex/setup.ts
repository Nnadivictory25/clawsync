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
  returns: v.boolean(),
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
  returns: v.object({ success: v.boolean() }),
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

    // Create default soul from the soul document
    const soulId = await ctx.db.insert('souls', {
      name: 'Default Soul',
      document: args.soulDocument,
      systemPrompt: `You are ${args.name}. Follow the guidance in your soul document to shape your responses.`,
      createdAt: now,
      updatedAt: now,
    });

    // Create default agent in the multi-agent system
    await ctx.db.insert('agents', {
      name: args.name,
      soulId,
      model: args.model,
      modelProvider: args.modelProvider,
      status: 'idle',
      mode: 'auto',
      isDefault: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

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

// Check if multi-agent migration is needed (agents table empty but agentConfig exists)
export const needsMigration = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const agent = await ctx.db.query('agents').first();
    if (agent) return false;
    const config = await ctx.db.query('agentConfig').first();
    return config !== null;
  },
});

// Trigger migration from legacy agentConfig to multi-agent system
export const migrateToMultiAgent = mutation({
  args: {},
  returns: v.object({ success: v.boolean(), agentId: v.optional(v.id('agents')) }),
  handler: async (ctx) => {
    // Check if agents table already has entries
    const existing = await ctx.db.query('agents').first();
    if (existing) return { success: true, agentId: existing._id };

    // Load legacy agentConfig
    const config = await ctx.db.query('agentConfig').first();
    if (!config) return { success: false };

    const now = Date.now();

    // Create soul from config
    const soulId = await ctx.db.insert('souls', {
      name: 'Default Soul',
      document: config.soulDocument,
      systemPrompt: config.systemPrompt,
      createdAt: now,
      updatedAt: now,
    });

    // Create default agent
    const agentId = await ctx.db.insert('agents', {
      name: config.name,
      soulId,
      model: config.model,
      modelProvider: config.modelProvider,
      fallbackModel: config.fallbackModel,
      fallbackProvider: config.fallbackProvider,
      status: 'idle',
      mode: 'auto',
      isDefault: true,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Assign all active+approved skills to the default agent
    const skills = await ctx.db
      .query('skillRegistry')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
    await Promise.all(
      skills
        .filter((s) => s.approved)
        .map((s) =>
          ctx.db.insert('agentSkillAssignments', {
            agentId,
            skillId: s._id,
            enabled: true,
          })
        )
    );

    // Assign all enabled+approved MCP servers
    const mcpServers = await ctx.db.query('mcpServers').collect();
    await Promise.all(
      mcpServers
        .filter((m) => m.enabled && m.approved)
        .map((m) =>
          ctx.db.insert('agentMcpAssignments', {
            agentId,
            mcpServerId: m._id,
            enabled: true,
          })
        )
    );

    return { success: true, agentId };
  },
});
