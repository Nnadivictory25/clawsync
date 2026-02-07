import { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { Doc } from '../_generated/dataModel';
import { tool as createTool } from 'ai';
import { z } from 'zod';
import { checkSecurity, truncateForLog } from './security';

/**
 * Tool Loader
 *
 * Assembles the agent's tools at invocation time from:
 * 1. Skills from skillRegistry (approved + active)
 * 2. Tools from connected MCP servers (approved + enabled)
 *
 * All tools pass through the security checker before execution.
 */

export type ToolSet = Record<string, ReturnType<typeof createTool>>;

/**
 * Load all tools for the agent
 */
export async function loadTools(ctx: ActionCtx): Promise<ToolSet> {
  const tools: ToolSet = {};

  // Load skills from skillRegistry
  const skills = await ctx.runQuery(internal.skillRegistry.getActiveApproved);

  for (const skill of skills) {
    const toolFn = createToolFromSkill(ctx, skill);
    if (toolFn) {
      tools[skill.name] = toolFn;
    }
  }

  // TODO: Load tools from MCP servers
  // const mcpServers = await ctx.runQuery(internal.mcpServers.getEnabledApproved);
  // for (const server of mcpServers) {
  //   const mcpTools = await loadMcpTools(ctx, server);
  //   Object.assign(tools, mcpTools);
  // }

  return tools;
}

/**
 * Create an AI SDK tool from a skill registry entry
 */
function createToolFromSkill(
  ctx: ActionCtx,
  skill: Doc<'skillRegistry'>
): ReturnType<typeof createTool> | null {
  switch (skill.skillType) {
    case 'template':
      return createTemplateSkillTool(ctx, skill);
    case 'webhook':
      return createWebhookSkillTool(ctx, skill);
    case 'code':
      // Code-defined skills are imported directly
      // This is a placeholder - actual implementation imports from skill files
      return createCodeSkillTool(ctx, skill);
    default:
      return null;
  }
}

/**
 * Create a tool from a template skill
 */
function createTemplateSkillTool(
  ctx: ActionCtx,
  skill: Doc<'skillRegistry'>
): ReturnType<typeof createTool> {
  return createTool({
    description: skill.description,
    parameters: z.object({
      input: z.string().describe('Input for the skill'),
    }),
    execute: async ({ input }) => {
      const startTime = Date.now();

      // Security check
      const securityResult = await checkSecurity(ctx, skill, input);
      if (!securityResult.allowed) {
        await logInvocation(ctx, skill, input, null, false, securityResult, startTime);
        return { error: securityResult.reason };
      }

      try {
        // Execute template skill via internal action
        const result = await ctx.runAction(
          internal.agent.skills.templates.execute,
          {
            templateId: skill.templateId!,
            config: skill.config || '{}',
            input,
          }
        );

        await logInvocation(ctx, skill, input, result, true, securityResult, startTime);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logInvocation(ctx, skill, input, null, false, securityResult, startTime, errorMessage);
        return { error: errorMessage };
      }
    },
  });
}

/**
 * Create a tool from a webhook skill
 */
function createWebhookSkillTool(
  ctx: ActionCtx,
  skill: Doc<'skillRegistry'>
): ReturnType<typeof createTool> {
  return createTool({
    description: skill.description,
    parameters: z.object({
      input: z.string().describe('Input for the webhook'),
    }),
    execute: async ({ input }) => {
      const startTime = Date.now();

      // Parse config for URL
      const config = skill.config ? JSON.parse(skill.config) : {};
      const domain = config.url ? new URL(config.url).hostname : undefined;

      // Security check with domain
      const securityResult = await checkSecurity(ctx, skill, input, { domain });
      if (!securityResult.allowed) {
        await logInvocation(ctx, skill, input, null, false, securityResult, startTime);
        return { error: securityResult.reason };
      }

      try {
        // Execute webhook via internal action
        const result = await ctx.runAction(
          internal.agent.skills.templates.webhookCaller,
          {
            config: skill.config || '{}',
            input,
            skillId: skill._id,
          }
        );

        await logInvocation(ctx, skill, input, result, true, securityResult, startTime);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logInvocation(ctx, skill, input, null, false, securityResult, startTime, errorMessage);
        return { error: errorMessage };
      }
    },
  });
}

/**
 * Create a tool from a code-defined skill
 * Placeholder - actual implementation imports from skill files
 */
function createCodeSkillTool(
  ctx: ActionCtx,
  skill: Doc<'skillRegistry'>
): ReturnType<typeof createTool> {
  return createTool({
    description: skill.description,
    parameters: z.object({
      query: z.string().describe('Query input'),
    }),
    execute: async ({ query }) => {
      const startTime = Date.now();

      // Security check
      const securityResult = await checkSecurity(ctx, skill, query);
      if (!securityResult.allowed) {
        await logInvocation(ctx, skill, query, null, false, securityResult, startTime);
        return { error: securityResult.reason };
      }

      try {
        // Code skills would be routed to their specific handlers here
        // For now, return a placeholder
        const result = `Code skill "${skill.name}" executed with query: ${query}`;

        await logInvocation(ctx, skill, query, result, true, securityResult, startTime);
        return { result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logInvocation(ctx, skill, query, null, false, securityResult, startTime, errorMessage);
        return { error: errorMessage };
      }
    },
  });
}

/**
 * Log skill invocation to the audit log
 */
async function logInvocation(
  ctx: ActionCtx,
  skill: Doc<'skillRegistry'>,
  input: unknown,
  output: unknown,
  success: boolean,
  securityResult: { code: string },
  startTime: number,
  errorMessage?: string
): Promise<void> {
  const durationMs = Date.now() - startTime;

  await ctx.runMutation(internal.skillInvocations.log, {
    skillName: skill.name,
    skillType: skill.skillType,
    input: truncateForLog(input),
    output: output ? truncateForLog(output) : undefined,
    success,
    errorMessage,
    securityCheckResult: securityResult.code,
    durationMs,
    timestamp: Date.now(),
  });
}
