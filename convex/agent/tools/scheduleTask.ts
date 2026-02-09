import { createTool } from '@convex-dev/agent';
import { jsonSchema } from 'ai';
import { ActionCtx } from '../../_generated/server';
import { internal } from '../../_generated/api';

/**
 * Schedule Task Tool
 * 
 * Creates scheduled tasks that run automatically.
 * Examples:
 * - "Every day at 9am, research Product Hunt and send me an email"
 * - "Weekly on Monday, check AI news and tweet a summary"
 * - "Every 6 hours, monitor trends"
 */

export function createScheduleTaskTool(ctx: ActionCtx) {
  return createTool({
    description: `Create a scheduled task that runs automatically on a schedule.
Use this when the user asks for:
- Daily/weekly recurring tasks
- "Every day at X time, do Y"
- "Weekly on Monday, send me updates"
- Automated reports or monitoring

The task will run automatically using Convex cron jobs.`,
    args: jsonSchema<{
      name: string;
      description: string;
      prompt: string;
      scheduleType: 'daily' | 'weekly' | 'interval';
      time?: string; // "09:00" for daily/weekly
      dayOfWeek?: number; // 0=Sunday, 1=Monday, etc.
      intervalMinutes?: number; // for interval type
    }>({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Short name for the task (e.g., "Daily AI News Summary")',
        },
        description: {
          type: 'string',
          description: 'What this task does',
        },
        prompt: {
          type: 'string',
          description: 'The AI prompt to run when the task executes',
        },
        scheduleType: {
          type: 'string',
          enum: ['daily', 'weekly', 'interval'],
          description: 'How often to run: daily, weekly, or interval',
        },
        time: {
          type: 'string',
          description: 'Time to run (24-hour format, e.g., "09:00" for 9am). Required for daily and weekly.',
        },
        dayOfWeek: {
          type: 'number',
          description: 'For weekly: 0=Sunday, 1=Monday, 2=Tuesday, etc.',
        },
        intervalMinutes: {
          type: 'number',
          description: 'For interval: minutes between runs (e.g., 60 for hourly)',
        },
      },
      required: ['name', 'description', 'prompt', 'scheduleType'],
    }),
    handler: async (_toolCtx, args: any) => {
      const { name, description, prompt, scheduleType, time, dayOfWeek, intervalMinutes } = args;

      try {
        // Build schedule object
        const schedule: any = {
          type: scheduleType,
        };

        if (scheduleType === 'daily' || scheduleType === 'weekly') {
          if (!time) {
            return {
              success: false,
              error: 'Time required',
              message: 'Please specify a time (e.g., "09:00" for 9am) for daily/weekly tasks.',
            };
          }
          schedule.time = time;
        }

        if (scheduleType === 'weekly') {
          schedule.dayOfWeek = dayOfWeek ?? 1; // Default to Monday
        }

        if (scheduleType === 'interval') {
          schedule.intervalMinutes = intervalMinutes || 60; // Default to hourly
        }

        // Create the schedule
        const scheduleId = await ctx.runMutation(internal.scheduledTasks.createSchedule, {
          name,
          description,
          prompt,
          schedule,
          enabled: true,
        });

        // Calculate when it will first run
        const nextRun = new Date();
        if (scheduleType === 'daily' || scheduleType === 'weekly') {
          const [hours, minutes] = time.split(':').map(Number);
          nextRun.setHours(hours, minutes, 0, 0);
          if (nextRun < new Date()) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        } else {
          nextRun.setMinutes(nextRun.getMinutes() + (intervalMinutes || 60));
        }

        return {
          success: true,
          message: `Scheduled task "${name}" created successfully!`,
          scheduleId,
          nextRun: nextRun.toLocaleString(),
          details: {
            name,
            description,
            scheduleType,
            time: time || 'N/A',
            dayOfWeek: scheduleType === 'weekly' ? (dayOfWeek ?? 1) : 'N/A',
          },
        };
      } catch (error) {
        console.error('Create schedule error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create schedule',
          message: 'Could not create scheduled task. Please try again.',
        };
      }
    },
  });
}
