import { Agent } from '@convex-dev/agent';
import { components, internal } from '../_generated/api';
import { anthropic } from '@ai-sdk/anthropic';

/**
 * ClawSync Agent Definition
 *
 * The agent is configured minimally here. Soul document, model config,
 * and tools are all loaded from Convex at runtime. This means SyncBoard
 * changes take effect on the next message without redeploying.
 *
 * Model selection and tools are resolved dynamically via:
 * - modelRouter.ts: Resolves provider + model from agentConfig
 * - toolLoader.ts: Assembles tools from skillRegistry + MCP servers
 */
export const clawsyncAgent = new Agent(components.agent, {
  name: 'ClawSync Agent',
  chat: anthropic('claude-sonnet-4-20250514'),
  textEmbedding: anthropic.textEmbeddingModel('voyage-3'),
  instructions: async (ctx) => {
    // Load soul document and system prompt from agentConfig
    const config = await ctx.runQuery(internal.agentConfig.getConfig);
    if (!config) {
      return 'You are a helpful AI assistant.';
    }
    return `${config.soulDocument}\n\n${config.systemPrompt}`;
  },
  // Tools are loaded dynamically - see toolLoader.ts
  tools: {},
});

// Export the agent for use in actions
export default clawsyncAgent;
