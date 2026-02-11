import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

/**
 * Analytics Cron Jobs
 *
 * Runs weekly AI analytics report generation every Monday at 7:00 AM UTC.
 */

const crons = cronJobs();

// Weekly analytics report - every Monday at 7:00 AM UTC
crons.cron(
  'weekly analytics report',
  '0 7 * * 1', // Monday 7 AM UTC
  internal.analyticsReportAction.generate,
  { reportType: 'weekly' as const }
);

export default crons;
