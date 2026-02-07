import { query, mutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Skill Templates
 *
 * Pre-built skill templates that users can configure without writing code.
 * Each template has a configSchema (what the user fills in) and an inputSchema
 * (what the agent provides at runtime).
 */

// Get all templates
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('skillTemplates').take(100);
  },
});

// Get templates by category
export const listByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillTemplates')
      .withIndex('by_category', (q) => q.eq('category', args.category))
      .take(50);
  },
});

// Get template by ID
export const getById = query({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillTemplates')
      .withIndex('by_templateId', (q) => q.eq('templateId', args.templateId))
      .first();
  },
});

// Get template by ID (internal - for MCP/tool execution)
export const getByTemplateId = internalQuery({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('skillTemplates')
      .withIndex('by_templateId', (q) => q.eq('templateId', args.templateId))
      .first();
  },
});

// Seed default templates
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
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
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
            headers: { type: 'object', additionalProperties: { type: 'string' } },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Data to send to the API' },
          },
        }),
        outputDescription: 'API response body (JSON or text)',
        supportsImages: false,
        version: '1.0.0',
      },
      {
        templateId: 'calculator',
        name: 'Calculator',
        description: 'Perform mathematical calculations',
        category: 'utility',
        configSchema: JSON.stringify({
          type: 'object',
          properties: {},
        }),
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
        templateId: 'rss-fetcher',
        name: 'RSS Fetcher',
        description: 'Fetch and parse RSS/Atom feeds',
        category: 'content',
        configSchema: JSON.stringify({
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', description: 'RSS feed URL' },
            maxItems: { type: 'number', default: 10 },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {},
        }),
        outputDescription: 'List of feed items with title, link, and description',
        supportsImages: false,
        version: '1.0.0',
      },
      {
        templateId: 'web-scraper',
        name: 'Web Scraper',
        description: 'Scrape content from web pages',
        category: 'content',
        configSchema: JSON.stringify({
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', description: 'URL to scrape' },
            selector: { type: 'string', description: 'CSS selector for content' },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Optional search query within page' },
          },
        }),
        outputDescription: 'Extracted text content from the page',
        supportsImages: false,
        version: '1.0.0',
      },
      {
        templateId: 'email-sender',
        name: 'Email Sender',
        description: 'Send emails via Resend',
        category: 'communication',
        configSchema: JSON.stringify({
          type: 'object',
          required: ['fromEmail'],
          properties: {
            fromEmail: { type: 'string', description: 'Sender email address' },
            fromName: { type: 'string', description: 'Sender name' },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          required: ['to', 'subject', 'body'],
          properties: {
            to: { type: 'string', description: 'Recipient email' },
            subject: { type: 'string', description: 'Email subject' },
            body: { type: 'string', description: 'Email body (plain text)' },
          },
        }),
        outputDescription: 'Send confirmation with message ID',
        supportsImages: false,
        version: '1.0.0',
      },
      {
        templateId: 'knowledge-lookup',
        name: 'Knowledge Lookup',
        description: 'Search through configured knowledge bases using RAG',
        category: 'knowledge',
        configSchema: JSON.stringify({
          type: 'object',
          required: ['namespace'],
          properties: {
            namespace: { type: 'string', description: 'Knowledge base namespace' },
            maxResults: { type: 'number', default: 5 },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
        }),
        outputDescription: 'Relevant knowledge base excerpts',
        supportsImages: false,
        version: '1.0.0',
      },
      {
        templateId: 'image-analyzer',
        name: 'Image Analyzer',
        description: 'Analyze images using vision models',
        category: 'media',
        configSchema: JSON.stringify({
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['describe', 'ocr', 'classify'],
              default: 'describe',
            },
          },
        }),
        inputSchema: JSON.stringify({
          type: 'object',
          required: ['imageUrl'],
          properties: {
            imageUrl: { type: 'string', description: 'URL of the image to analyze' },
            prompt: { type: 'string', description: 'Optional analysis prompt' },
          },
        }),
        outputDescription: 'Image analysis results',
        supportsImages: true,
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

    return { seeded: templates.length };
  },
});
