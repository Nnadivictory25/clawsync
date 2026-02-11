'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

/**
 * Skills Marketplace sync action (Node.js runtime).
 * Fetches skills from external sources (GitHub, Skills Directory, custom registries).
 */

export const syncSource = action({
  args: { sourceId: v.id('externalSkillSources') },
  returns: v.object({
    imported: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const source = await ctx.runQuery(
      internal.skillsMarketplace.getSourceInternal,
      { id: args.sourceId }
    );

    if (!source) {
      return { imported: 0, error: 'Source not found' };
    }

    let skills: Array<{
      externalId: string;
      name: string;
      description: string;
      content: string;
      category?: string;
      version?: string;
      author?: string;
      sourceUrl?: string;
    }> = [];

    try {
      if (source.sourceType === 'github_repo') {
        skills = await fetchGitHubSkills(source.url, source.apiKey);
      } else if (source.sourceType === 'skills_directory') {
        skills = await fetchSkillsDirectory(source.url);
      } else if (source.sourceType === 'custom_registry') {
        skills = await fetchCustomRegistry(source.url, source.apiKey);
      }
    } catch (error) {
      return {
        imported: 0,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }

    let importedCount = 0;
    for (const skill of skills) {
      await ctx.runMutation(internal.skillsMarketplace.upsertImportedSkill, {
        sourceId: args.sourceId,
        externalId: skill.externalId,
        name: skill.name,
        description: skill.description,
        content: skill.content,
        category: skill.category,
        version: skill.version,
        author: skill.author,
        sourceUrl: skill.sourceUrl,
      });
      importedCount++;
    }

    await ctx.runMutation(internal.skillsMarketplace.updateSourceSync, {
      sourceId: args.sourceId,
      skillCount: importedCount,
    });

    return { imported: importedCount };
  },
});

// ============================================
// Fetch Helpers
// ============================================

async function fetchGitHubSkills(
  repoPath: string,
  token?: string
): Promise<
  Array<{
    externalId: string;
    name: string;
    description: string;
    content: string;
    category?: string;
    author?: string;
    sourceUrl?: string;
  }>
> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const treeUrl = `https://api.github.com/repos/${repoPath}/git/trees/main?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });
  if (!treeRes.ok) throw new Error(`GitHub API error: ${treeRes.status}`);

  const tree = await treeRes.json();
  const skillFiles = (
    tree.tree as Array<{ path: string; type: string }>
  ).filter(
    (f) =>
      f.type === 'blob' &&
      (f.path.endsWith('SKILL.md') || f.path.endsWith('skill.md'))
  );

  const skills = [];
  for (const file of skillFiles.slice(0, 50)) {
    const contentUrl = `https://api.github.com/repos/${repoPath}/contents/${file.path}`;
    const contentRes = await fetch(contentUrl, { headers });
    if (!contentRes.ok) continue;

    const data = await contentRes.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');

    const pathParts = file.path.split('/');
    const folderName =
      pathParts.length > 1 ? pathParts[pathParts.length - 2] : file.path;

    const nameMatch = content.match(/^#\s+(.+)$/m);
    const descMatch = content.match(/^(?:description|summary):\s*(.+)$/im);

    skills.push({
      externalId: `github:${repoPath}:${file.path}`,
      name: nameMatch?.[1] ?? folderName,
      description: descMatch?.[1] ?? `Skill from ${repoPath}`,
      content,
      author: repoPath.split('/')[0],
      sourceUrl: `https://github.com/${repoPath}/blob/main/${file.path}`,
    });
  }

  return skills;
}

async function fetchSkillsDirectory(
  apiUrl: string
): Promise<
  Array<{
    externalId: string;
    name: string;
    description: string;
    content: string;
    category?: string;
    version?: string;
    author?: string;
    sourceUrl?: string;
  }>
> {
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Skills Directory API error: ${res.status}`);

  const data = await res.json();
  const items = Array.isArray(data) ? data : data.skills ?? [];

  return items.map((item: Record<string, string>) => ({
    externalId: `sd:${item.id ?? item.name}`,
    name: item.name ?? 'Unnamed Skill',
    description: item.description ?? '',
    content: item.content ?? item.instructions ?? '',
    category: item.category,
    version: item.version,
    author: item.author,
    sourceUrl: item.url,
  }));
}

async function fetchCustomRegistry(
  url: string,
  apiKey?: string
): Promise<
  Array<{
    externalId: string;
    name: string;
    description: string;
    content: string;
    category?: string;
  }>
> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Custom registry error: ${res.status}`);

  const data = await res.json();
  const items = Array.isArray(data) ? data : data.skills ?? [];

  return items.map((item: Record<string, string>, i: number) => ({
    externalId: `custom:${item.id ?? `${url}-${i}`}`,
    name: item.name ?? 'Unnamed Skill',
    description: item.description ?? '',
    content: item.content ?? '',
    category: item.category,
  }));
}
