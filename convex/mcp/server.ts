/**
 * MCP Server Implementation
 *
 * Exposes ClawSync's active skills as MCP tools.
 * Any MCP client (Claude Desktop, Cursor, VS Code) can connect.
 *
 * Implements:
 * - tools/list: Returns all approved + active skills
 * - tools/call: Routes to skill executor (through security checker)
 * - resources/list: Returns available knowledge bases
 * - resources/read: Returns knowledge base content
 */

import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';

// MCP server handler
export const handler = httpAction(async (ctx, request) => {
  const body = await request.json();
  const { method, params } = body;

  switch (method) {
    case 'tools/list':
      return handleToolsList(ctx);

    case 'tools/call':
      return handleToolsCall(ctx, params);

    case 'resources/list':
      return handleResourcesList(ctx);

    case 'resources/read':
      return handleResourcesRead(ctx, params);

    default:
      return new Response(
        JSON.stringify({ error: `Unknown method: ${method}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
  }
});

async function handleToolsList(ctx: Parameters<typeof httpAction>[0] extends (ctx: infer C, req: unknown) => unknown ? C : never) {
  // Get all active + approved skills
  const skills = await ctx.runQuery(internal.skillRegistry.getActiveApproved);

  const tools = skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    inputSchema: skill.config ? JSON.parse(skill.config).inputSchema : {},
  }));

  return new Response(
    JSON.stringify({ tools }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleToolsCall(
  ctx: Parameters<typeof httpAction>[0] extends (ctx: infer C, req: unknown) => unknown ? C : never,
  params: { name: string; arguments: Record<string, unknown> }
) {
  try {
    // Execute the tool through the MCP internal action
    const result = await ctx.runAction(internal.mcp.executeTool, {
      toolName: params.name,
      input: params.arguments,
    });

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ result: result.output }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleResourcesList(_ctx: Parameters<typeof httpAction>[0] extends (ctx: infer C, req: unknown) => unknown ? C : never) {
  // TODO: Return knowledge base resources
  return new Response(
    JSON.stringify({ resources: [] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

async function handleResourcesRead(
  _ctx: Parameters<typeof httpAction>[0] extends (ctx: infer C, req: unknown) => unknown ? C : never,
  _params: { uri: string }
) {
  // TODO: Return knowledge base content
  return new Response(
    JSON.stringify({ error: 'Not implemented' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  );
}
