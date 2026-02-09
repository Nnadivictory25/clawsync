import { Agent } from '@convex-dev/agent';
import { components } from '../_generated/api';
import { ActionCtx } from '../_generated/server';
import { anthropic } from '@ai-sdk/anthropic';
import { resolveModel } from './modelRouter';
import { loadTools } from './toolLoader';

/**
 * ClawSync Agent Definition
 *
 * Default static agent used as a fallback. For dynamic model/tool
 * selection based on SyncBoard config, use createDynamicAgent().
 */
export const clawsyncAgent = new Agent(components.agent, {
  name: 'ClawSync Agent',
  languageModel: anthropic('claude-sonnet-4-20250514'),
  instructions: `You are a helpful AI assistant.

When conducting research or searching for information, ALWAYS include:
1. Source URLs/links for any information you find
2. Reference the specific websites or sources you used
3. Include relevant links that the user can click to verify or learn more

Example format:
"According to [Source Name](URL), the key findings are..."

This helps users verify information and explore topics further.`,
  // Tools are loaded dynamically at call-site - see toolLoader.ts
  tools: {},
});

/**
 * Create a dynamic agent using the model and tools from SyncBoard config.
 * This allows changing models and tools without redeployment.
 */
export async function createDynamicAgent(ctx: ActionCtx): Promise<Agent> {
  // Resolve model from agentConfig + modelProviders
  const resolved = await resolveModel(ctx);

  // Load approved + active tools from skillRegistry + MCP servers
  const tools = await loadTools(ctx);

  return new Agent(components.agent, {
    name: 'ClawSync Agent',
    languageModel: resolved.model,
    // Instructions loaded at call-site via system prompt in generateText
    instructions: `You are a helpful AI assistant.

When conducting research or searching for information, ALWAYS include:
1. Source URLs/links for any information you find
2. Reference the specific websites or sources you used
3. Include relevant links that the user can click to verify or learn more

Example format:
"According to [Source Name](URL), the key findings are..."

This helps users verify information and explore topics further.`,
    tools,
  });
}

// Export the static agent as default
export default clawsyncAgent;
