import { query, mutation, internalQuery, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Multi-Agent CRUD
 *
 * Manages individual agent configurations. Each agent has its own
 * model, soul, skills, MCP servers, and status/mode controls.
 */

// List all agents ordered by display order
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('agents'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      soulId: v.optional(v.id('souls')),
      soulDocument: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      model: v.string(),
      modelProvider: v.string(),
      fallbackModel: v.optional(v.string()),
      fallbackProvider: v.optional(v.string()),
      status: v.string(),
      mode: v.string(),
      avatar: v.optional(v.string()),
      isDefault: v.boolean(),
      order: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const agents = await ctx.db
      .query('agents')
      .withIndex('by_order')
      .collect();
    return agents as any;
  },
});

// Get a single agent by ID
export const get = query({
  args: { agentId: v.id('agents') },
  returns: v.union(
    v.object({
      _id: v.id('agents'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      soulId: v.optional(v.id('souls')),
      soulDocument: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      model: v.string(),
      modelProvider: v.string(),
      fallbackModel: v.optional(v.string()),
      fallbackProvider: v.optional(v.string()),
      status: v.string(),
      mode: v.string(),
      avatar: v.optional(v.string()),
      isDefault: v.boolean(),
      order: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    return agent as any;
  },
});

// Internal: get agent for backend use (actions)
export const getInternal = internalQuery({
  args: { agentId: v.id('agents') },
  returns: v.union(
    v.object({
      _id: v.id('agents'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      soulId: v.optional(v.id('souls')),
      soulDocument: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      model: v.string(),
      modelProvider: v.string(),
      fallbackModel: v.optional(v.string()),
      fallbackProvider: v.optional(v.string()),
      status: v.string(),
      mode: v.string(),
      avatar: v.optional(v.string()),
      isDefault: v.boolean(),
      order: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return (await ctx.db.get(args.agentId)) as any;
  },
});

// Internal: get the default agent (first with isDefault=true, or first by order)
export const getDefault = internalQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id('agents'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      soulId: v.optional(v.id('souls')),
      soulDocument: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      model: v.string(),
      modelProvider: v.string(),
      fallbackModel: v.optional(v.string()),
      fallbackProvider: v.optional(v.string()),
      status: v.string(),
      mode: v.string(),
      avatar: v.optional(v.string()),
      isDefault: v.boolean(),
      order: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Try default first
    const defaultAgent = await ctx.db
      .query('agents')
      .withIndex('by_default', (q) => q.eq('isDefault', true))
      .first();
    if (defaultAgent) return defaultAgent as any;

    // Fall back to first agent by order
    const first = await ctx.db
      .query('agents')
      .withIndex('by_order')
      .first();
    return (first as any) ?? null;
  },
});

// Create a new agent
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    soulId: v.optional(v.id('souls')),
    soulDocument: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.string(),
    modelProvider: v.string(),
    fallbackModel: v.optional(v.string()),
    fallbackProvider: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  returns: v.id('agents'),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine order (next in sequence)
    const existing = await ctx.db.query('agents').withIndex('by_order').collect();
    const maxOrder = existing.length > 0
      ? Math.max(...existing.map((a) => a.order))
      : -1;

    // If marking as default, clear other defaults
    const isDefault = args.isDefault ?? (existing.length === 0);
    if (isDefault) {
      const currentDefaults = await ctx.db
        .query('agents')
        .withIndex('by_default', (q) => q.eq('isDefault', true))
        .collect();
      await Promise.all(
        currentDefaults.map((a) => ctx.db.patch(a._id, { isDefault: false }))
      );
    }

    return await ctx.db.insert('agents', {
      name: args.name,
      description: args.description,
      soulId: args.soulId,
      soulDocument: args.soulDocument,
      systemPrompt: args.systemPrompt,
      model: args.model,
      modelProvider: args.modelProvider,
      fallbackModel: args.fallbackModel,
      fallbackProvider: args.fallbackProvider,
      status: 'idle',
      mode: 'auto',
      avatar: args.avatar,
      isDefault,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update an agent's configuration
export const update = mutation({
  args: {
    agentId: v.id('agents'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    soulId: v.optional(v.id('souls')),
    soulDocument: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    modelProvider: v.optional(v.string()),
    fallbackModel: v.optional(v.string()),
    fallbackProvider: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { agentId, ...fields } = args;

    // If setting as default, clear others
    if (fields.isDefault === true) {
      const currentDefaults = await ctx.db
        .query('agents')
        .withIndex('by_default', (q) => q.eq('isDefault', true))
        .collect();
      await Promise.all(
        currentDefaults
          .filter((a) => a._id !== agentId)
          .map((a) => ctx.db.patch(a._id, { isDefault: false }))
      );
    }

    // Build patch object with only defined fields
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        patch[key] = value;
      }
    }

    await ctx.db.patch(agentId, patch);
    return null;
  },
});

// Update agent status (running/paused/idle/error)
export const updateStatus = mutation({
  args: {
    agentId: v.id('agents'),
    status: v.union(
      v.literal('running'),
      v.literal('paused'),
      v.literal('idle'),
      v.literal('error')
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update agent mode (auto/paused/single_task/think_to_continue)
export const updateMode = mutation({
  args: {
    agentId: v.id('agents'),
    mode: v.union(
      v.literal('auto'),
      v.literal('paused'),
      v.literal('single_task'),
      v.literal('think_to_continue')
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Paused mode also sets status to paused
    const statusPatch = args.mode === 'paused' ? { status: 'paused' as const } : {};
    await ctx.db.patch(args.agentId, {
      mode: args.mode,
      ...statusPatch,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Delete an agent and its assignments
export const remove = mutation({
  args: { agentId: v.id('agents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete skill assignments
    const skillAssignments = await ctx.db
      .query('agentSkillAssignments')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .collect();
    await Promise.all(skillAssignments.map((a) => ctx.db.delete(a._id)));

    // Delete MCP assignments
    const mcpAssignments = await ctx.db
      .query('agentMcpAssignments')
      .withIndex('by_agentId', (q) => q.eq('agentId', args.agentId))
      .collect();
    await Promise.all(mcpAssignments.map((a) => ctx.db.delete(a._id)));

    // Delete the agent
    await ctx.db.delete(args.agentId);
    return null;
  },
});

// Reorder agents (update display order)
export const reorder = mutation({
  args: {
    agentIds: v.array(v.id('agents')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(
      args.agentIds.map((id, index) =>
        ctx.db.patch(id, { order: index, updatedAt: Date.now() })
      )
    );
    return null;
  },
});

// Internal: list all agents (for HTTP API)
export const listAll = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query('agents').withIndex('by_order').collect();
  },
});

// Internal: migrate from agentConfig to agents table (one-time)
export const migrateFromConfig = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if agents table already has entries
    const existing = await ctx.db.query('agents').first();
    if (existing) return null;

    // Load legacy agentConfig
    const config = await ctx.db.query('agentConfig').first();
    if (!config) return null;

    const now = Date.now();

    // Create soul from config
    const soulId = await ctx.db.insert('souls', {
      name: 'Default Soul',
      document: config.soulDocument,
      systemPrompt: config.systemPrompt,
      createdAt: now,
      updatedAt: now,
    });

    // Create default agent from config
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

    // Assign all active+approved skills
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

    return null;
  },
});
