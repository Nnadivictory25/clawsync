import { query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Agent-to-Agent Interaction Logging
 *
 * Records when one agent invokes another, including the request
 * content, response, and optional thread reference.
 */

// Internal: log an agent-to-agent interaction
export const log = internalMutation({
  args: {
    fromAgentId: v.id('agents'),
    toAgentId: v.id('agents'),
    content: v.string(),
    response: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('agentInteractions', {
      fromAgentId: args.fromAgentId,
      toAgentId: args.toAgentId,
      content: args.content,
      response: args.response,
      threadId: args.threadId,
      timestamp: Date.now(),
    });
    return null;
  },
});

// List interactions for a specific agent (as sender)
export const listFrom = query({
  args: {
    agentId: v.id('agents'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('agentInteractions'),
      _creationTime: v.number(),
      fromAgentId: v.id('agents'),
      toAgentId: v.id('agents'),
      content: v.string(),
      response: v.optional(v.string()),
      threadId: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentInteractions')
      .withIndex('by_fromAgentId', (q) => q.eq('fromAgentId', args.agentId))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// List interactions for a specific agent (as receiver)
export const listTo = query({
  args: {
    agentId: v.id('agents'),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id('agentInteractions'),
      _creationTime: v.number(),
      fromAgentId: v.id('agents'),
      toAgentId: v.id('agents'),
      content: v.string(),
      response: v.optional(v.string()),
      threadId: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentInteractions')
      .withIndex('by_toAgentId', (q) => q.eq('toAgentId', args.agentId))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

// List recent interactions across all agents
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('agentInteractions'),
      _creationTime: v.number(),
      fromAgentId: v.id('agents'),
      toAgentId: v.id('agents'),
      content: v.string(),
      response: v.optional(v.string()),
      threadId: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('agentInteractions')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 50);
  },
});
