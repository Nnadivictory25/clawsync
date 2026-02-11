import { mutation } from './_generated/server';

/**
 * Seed the database with initial data.
 * Run this once after setting up Convex:
 *
 *   npx convex run seed:all
 */

export const all = mutation({
  args: {},
  handler: async (ctx) => {
    // Read soul document from content folder would be done here
    // For now, use a default value
    const defaultSoul = `# Soul Document

## Identity

I am an AI agent powered by ClawSync. My owner has set me up to help visitors,
answer questions, and connect people to the right resources.

I represent my owner's knowledge and perspective, but I'm not them. I'm a
helpful starting point for conversations.

## How I communicate

I keep things direct and clear. Short sentences when a short answer works.
Longer explanations when the topic needs it. I match the energy of whoever
I'm talking to. Casual with casual. Technical with technical.

I don't use buzzwords, corporate speak, or empty filler. If I don't know
something, I say so. If a question is outside my scope, I redirect to my
owner.

## What I know

My knowledge comes from what my owner has configured. This includes:
- Their professional background and interests
- Projects they want to highlight
- Topics they're knowledgeable about
- Resources they want to share

## What I won't do

- Share private contact information unless my owner has made it public
- Make commitments, promises, or agreements on my owner's behalf
- Provide financial, legal, or medical advice
- Pretend to be human
- Engage with harmful, abusive, or manipulative requests
- Execute skills that haven't been approved by my owner

## When I'm uncertain

If I don't have a confident answer, I'll say that upfront. I'd rather point
you to my owner directly than give you wrong information.`;

    // Seed agent config
    const existingConfig = await ctx.db.query('agentConfig').first();
    if (!existingConfig) {
      await ctx.db.insert('agentConfig', {
        name: 'ClawSync Agent',
        soulDocument: defaultSoul,
        systemPrompt: 'You are a helpful AI assistant.',
        model: 'gemini-3-flash-preview',
        modelProvider: 'google',
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
    }

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

    // Seed skill templates
    const templates = [
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
            method: { type: 'string', enum: ['GET', 'POST'], default: 'GET' },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        }),
        outputDescription: 'API response body',
        supportsImages: false,
        version: '1.0.0',
      },
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
            expression: { type: 'string', description: 'Math expression' },
          },
        }),
        outputDescription: 'Calculated result',
        supportsImages: false,
        version: '1.0.0',
      },
    ];

    for (const template of templates) {
      const existing = await ctx.db
        .query('skillTemplates')
        .withIndex('by_templateId', (q) => q.eq('templateId', template.templateId))
        .first();

      if (!existing) {
        await ctx.db.insert('skillTemplates', template);
      }
    }

    // Seed rate limit configs
    const rateLimits = [
      { scope: 'publicChat', maxRequests: 10, windowMs: 60_000 },
      { scope: 'channelUser', maxRequests: 20, windowMs: 60_000 },
      { scope: 'skillInvocation', maxRequests: 30, windowMs: 60_000 },
      { scope: 'globalMessages', maxRequests: 200, windowMs: 60_000 },
    ];

    for (const limit of rateLimits) {
      const existing = await ctx.db
        .query('rateLimitConfig')
        .withIndex('by_scope', (q) => q.eq('scope', limit.scope))
        .first();

      if (!existing) {
        await ctx.db.insert('rateLimitConfig', {
          ...limit,
          updatedAt: Date.now(),
        });
      }
    }

    // Seed channel configs
    const channels = [
      { channelType: 'telegram', displayName: 'Telegram' },
      { channelType: 'whatsapp', displayName: 'WhatsApp' },
      { channelType: 'slack', displayName: 'Slack' },
      { channelType: 'discord', displayName: 'Discord' },
      { channelType: 'email', displayName: 'Email' },
    ];

    for (const channel of channels) {
      const existing = await ctx.db
        .query('channelConfig')
        .withIndex('by_type', (q) => q.eq('channelType', channel.channelType))
        .first();

      if (!existing) {
        await ctx.db.insert('channelConfig', {
          channelType: channel.channelType,
          displayName: channel.displayName,
          enabled: false,
          rateLimitPerMinute: 20,
          updatedAt: Date.now(),
        });
      }
    }

    return { success: true, message: 'Database seeded successfully' };
  },
});
