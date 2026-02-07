'use node';

import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { clawsyncAgent } from './agent/clawsync';
import { rateLimiter } from './rateLimits';

/**
 * Chat Functions
 *
 * Handles sending messages to the agent and receiving responses.
 * Uses @convex-dev/agent for thread management and streaming.
 */

// Send a message and get a response
export const send = action({
  args: {
    threadId: v.optional(v.string()),
    message: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limit check
    const { ok } = await rateLimiter.limit(ctx, 'publicChat', {
      key: args.sessionId,
    });

    if (!ok) {
      return {
        error: 'Rate limit exceeded. Please wait before sending another message.',
        threadId: args.threadId,
      };
    }

    // Global rate limit
    const { ok: globalOk } = await rateLimiter.limit(ctx, 'globalMessages', {
      key: 'global',
    });

    if (!globalOk) {
      return {
        error: 'The agent is currently busy. Please try again in a moment.',
        threadId: args.threadId,
      };
    }

    // Validate message length
    const maxLength = 4000;
    if (args.message.length > maxLength) {
      return {
        error: `Message too long. Maximum ${maxLength} characters.`,
        threadId: args.threadId,
      };
    }

    try {
      // Create or continue thread
      const thread = args.threadId
        ? await clawsyncAgent.continueThread(ctx, { threadId: args.threadId })
        : await clawsyncAgent.createThread(ctx, {});

      // Generate response
      const result = await thread.generateText({
        prompt: args.message,
      });

      // Log activity
      await ctx.runMutation(internal.activityLog.log, {
        actionType: 'chat_message',
        summary: `Responded to: "${args.message.slice(0, 50)}${args.message.length > 50 ? '...' : ''}"`,
        visibility: 'private',
      });

      return {
        response: result.text,
        threadId: thread.threadId,
      };
    } catch (error) {
      console.error('Chat error:', error);
      return {
        error: 'Failed to generate response. Please try again.',
        threadId: args.threadId,
      };
    }
  },
});

// Stream a response (for real-time output)
export const stream = internalAction({
  args: {
    threadId: v.optional(v.string()),
    message: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limit check
    const { ok } = await rateLimiter.limit(ctx, 'publicChat', {
      key: args.sessionId,
    });

    if (!ok) {
      throw new Error('Rate limit exceeded');
    }

    const thread = args.threadId
      ? await clawsyncAgent.continueThread(ctx, { threadId: args.threadId })
      : await clawsyncAgent.createThread(ctx, {});

    // Use streaming generation
    const result = await thread.generateText({
      prompt: args.message,
    });

    return {
      response: result.text,
      threadId: thread.threadId,
    };
  },
});

// Get thread history
export const getHistory = action({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const messages = await clawsyncAgent.listMessages(ctx, {
        threadId: args.threadId,
      });

      return { messages };
    } catch {
      return { messages: [] };
    }
  },
});

// API Send - Internal action for HTTP API
export const apiSend = internalAction({
  args: {
    message: v.string(),
    threadId: v.optional(v.string()),
    sessionId: v.string(),
    apiKeyId: v.optional(v.id('apiKeys')),
  },
  handler: async (ctx, args) => {
    // Validate message length
    const maxLength = 4000;
    if (args.message.length > maxLength) {
      return {
        error: `Message too long. Maximum ${maxLength} characters.`,
        threadId: args.threadId,
      };
    }

    try {
      // Create or continue thread
      const thread = args.threadId
        ? await clawsyncAgent.continueThread(ctx, { threadId: args.threadId })
        : await clawsyncAgent.createThread(ctx, {});

      // Generate response
      const result = await thread.generateText({
        prompt: args.message,
      });

      // Log activity
      await ctx.runMutation(internal.activityLog.log, {
        actionType: 'api_chat',
        summary: `API: "${args.message.slice(0, 50)}${args.message.length > 50 ? '...' : ''}"`,
        visibility: 'private',
        channel: 'api',
      });

      // Get token usage from result if available
      const usage = (result as any).usage ?? {};

      return {
        response: result.text,
        threadId: thread.threadId,
        tokensUsed: (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0),
        inputTokens: usage.promptTokens ?? 0,
        outputTokens: usage.completionTokens ?? 0,
      };
    } catch (error) {
      console.error('API Chat error:', error);
      return {
        error: 'Failed to generate response. Please try again.',
        threadId: args.threadId,
      };
    }
  },
});
