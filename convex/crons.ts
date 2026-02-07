import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

/**
 * Cron Jobs
 *
 * Background jobs that run on a schedule. These are isolated from
 * real-time traffic to prevent contention.
 *
 * - Summary aggregation: Moves data from hot logs to cold summary tables
 * - Health checks: Monitors MCP servers
 * - Cleanup: Removes old logs to control storage
 */

const crons = cronJobs();

// Aggregate skill invocation summaries every 5 minutes
crons.interval(
  'aggregate skill invocation summaries',
  { minutes: 5 },
  internal.skillSummary.aggregate
);

// Check MCP server health every 5 minutes
crons.interval(
  'check MCP server health',
  { minutes: 5 },
  internal.mcpServers.healthCheck
);

// Cleanup old invocation logs daily (keep 30 days)
crons.interval(
  'cleanup old invocation logs',
  { hours: 24 },
  internal.skillInvocations.cleanup
);

// Aggregate API usage summaries every 5 minutes
crons.interval(
  'aggregate API usage summaries',
  { minutes: 5 },
  internal.apiUsage.aggregate
);

// Cleanup old API usage logs daily (keep 30 days)
crons.interval(
  'cleanup old API usage logs',
  { hours: 24 },
  internal.apiUsage.cleanup
);

export default crons;
