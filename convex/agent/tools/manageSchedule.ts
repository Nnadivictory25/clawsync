import { createTool } from '@convex-dev/agent';
import { jsonSchema } from 'ai';
import { ActionCtx } from '../../_generated/server';
import { api } from '../../_generated/api';

/**
 * Manage Scheduled Tasks Tools
 * 
 * Tools for listing, deleting, and toggling scheduled tasks.
 */

export function createManageScheduleTools(ctx: ActionCtx) {
  return {
    // List all scheduled tasks
    list_scheduled_tasks: createTool({
      description: `List all scheduled tasks.
Use this when:
- The user asks "what tasks do I have scheduled?"
- The user wants to see their scheduled tasks
- You need to check what tasks exist before deleting/updating`,
      args: jsonSchema<{}>({
        type: 'object',
        properties: {},
      }),
      handler: async () => {
        try {
          const tasks = await ctx.runQuery(api.scheduledTasks.listSchedules);
          
          if (!tasks || tasks.length === 0) {
            return {
              success: true,
              message: 'No scheduled tasks found.',
              tasks: [],
              count: 0,
            };
          }

          const formattedTasks = tasks.map((task: any) => ({
            id: task._id,
            name: task.name,
            description: task.description,
            enabled: task.enabled,
            scheduleType: task.schedule.type,
            nextRun: new Date(task.nextRunAt).toLocaleString(),
            runCount: task.runCount,
          }));

          return {
            success: true,
            message: `Found ${tasks.length} scheduled task(s):`,
            tasks: formattedTasks,
            count: tasks.length,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list tasks',
            message: 'Could not retrieve scheduled tasks.',
          };
        }
      },
    }),

    // Delete a scheduled task
    delete_scheduled_task: createTool({
      description: `Delete a scheduled task by ID.
Use this when:
- The user asks to delete/remove a scheduled task
- The user says "remove the daily news task"
- You need to delete a task after listing them`,
      args: jsonSchema<{
        taskId: string;
      }>({
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task to delete (from list_scheduled_tasks)',
          },
        },
        required: ['taskId'],
      }),
      handler: async (_toolCtx, args: any) => {
        const { taskId } = args;

        try {
          await ctx.runMutation(api.scheduledTasks.deleteSchedule, {
            taskId: taskId as any,
          });

          return {
            success: true,
            message: `Task deleted successfully.`,
            taskId,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete task',
            message: 'Could not delete the scheduled task. Make sure the ID is correct.',
          };
        }
      },
    }),

    // Toggle (enable/disable) a scheduled task
    toggle_scheduled_task: createTool({
      description: `Enable or disable a scheduled task by ID.
Use this when:
- The user asks to pause/stop a scheduled task
- The user asks to enable/resume a scheduled task
- The user says "turn off the daily emails"`,
      args: jsonSchema<{
        taskId: string;
        enabled: boolean;
      }>({
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The ID of the task to toggle (from list_scheduled_tasks)',
          },
          enabled: {
            type: 'boolean',
            description: 'true to enable, false to disable',
          },
        },
        required: ['taskId', 'enabled'],
      }),
      handler: async (_toolCtx, args: any) => {
        const { taskId, enabled } = args;

        try {
          await ctx.runMutation(api.scheduledTasks.toggleSchedule, {
            taskId: taskId as any,
            enabled,
          });

          return {
            success: true,
            message: `Task ${enabled ? 'enabled' : 'disabled'} successfully.`,
            taskId,
            enabled,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle task',
            message: 'Could not update the scheduled task. Make sure the ID is correct.',
          };
        }
      },
    }),
  };
}
