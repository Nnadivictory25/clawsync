import { v } from 'convex/values';
import { query, mutation, action, internalMutation, internalQuery, internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { createDynamicAgent } from './agent/clawsync';

/**
 * Personal Scheduler
 * 
 * Simple scheduled tasks for single user.
 * Examples:
 * - "Every day at 9am, research Product Hunt and send Telegram update"
 * - "Weekly on Monday, check AI news on X and compile PDF"
 * - "Every 6 hours, monitor r/technology for trends"
 */

// Create a new scheduled task
export const createSchedule = internalMutation({
  args: {
    name: v.string(),
    description: v.string(),
    prompt: v.string(), // The AI prompt to run
    schedule: v.object({
      type: v.union(v.literal('daily'), v.literal('weekly'), v.literal('interval')),
      time: v.optional(v.string()), // "09:00" for daily/weekly
      dayOfWeek: v.optional(v.number()), // 0-6 for weekly (0=Sunday)
      intervalMinutes: v.optional(v.number()), // for interval type
    }),
    enabled: v.boolean(),
  },
  returns: v.id('scheduledTasks'),
  handler: async (ctx, args) => {
    const scheduleId = await ctx.db.insert('scheduledTasks', {
      name: args.name,
      description: args.description,
      prompt: args.prompt,
      schedule: args.schedule,
      enabled: args.enabled,
      lastRunAt: undefined,
      nextRunAt: calculateNextRun(args.schedule),
      createdAt: Date.now(),
      runCount: 0,
    });
    return scheduleId;
  },
});

// Get all scheduled tasks (public API)
export const listSchedules = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('scheduledTasks')
      .order('desc')
      .collect();
  },
});

// Get all scheduled tasks (internal)
export const getSchedules = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('scheduledTasks')
      .order('desc')
      .collect();
  },
});

// Get due tasks (nextRunAt <= now)
export const getDueTasks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query('scheduledTasks')
      .withIndex('by_nextRun', (q) => 
        q.lte('nextRunAt', now)
      )
      .filter((q) => q.eq(q.field('enabled'), true))
      .collect();
  },
});

// Mark task as run and update next run time
export const markTaskRun = internalMutation({
  args: {
    taskId: v.id('scheduledTasks'),
    success: v.boolean(),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return;

    await ctx.db.insert('scheduleRuns', {
      taskId: args.taskId,
      runAt: Date.now(),
      success: args.success,
      result: args.result,
    });

    await ctx.db.patch(args.taskId, {
      lastRunAt: Date.now(),
      nextRunAt: calculateNextRun(task.schedule),
      runCount: task.runCount + 1,
    });
  },
});

// Enable/disable task (public API)
export const toggleSchedule = mutation({
  args: {
    taskId: v.id('scheduledTasks'),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { enabled: args.enabled });
    return { success: true };
  },
});

// Enable/disable task (internal)
export const toggleScheduleInternal = internalMutation({
  args: {
    taskId: v.id('scheduledTasks'),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { enabled: args.enabled });
  },
});

// Delete task (public API)
export const deleteSchedule = mutation({
  args: {
    taskId: v.id('scheduledTasks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

// Delete task (internal)
export const deleteScheduleInternal = internalMutation({
  args: {
    taskId: v.id('scheduledTasks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
  },
});

// Execute a scheduled task (called by cron)
export const executeTask = internalAction({
  args: {
    taskId: v.id('scheduledTasks'),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.scheduledTasks.getTaskById, {
      taskId: args.taskId,
    });
    
    if (!task || !task.enabled) {
      return { success: false, error: 'Task not found or disabled' };
    }

    try {
      console.log(`[Scheduler] Executing task: ${task.name}`);
      
      // Create agent and run the prompt
      const agent = await createDynamicAgent(ctx);
      const { thread } = await agent.createThread(ctx, {});
      
      const result = await thread.generateText({
        prompt: task.prompt,
      });

      await ctx.runMutation(internal.scheduledTasks.markTaskRun, {
        taskId: args.taskId,
        success: true,
        result: result.text.slice(0, 1000), // Store preview
      });

      return { success: true, result: result.text };
    } catch (error) {
      console.error(`[Scheduler] Task failed: ${task.name}`, error);
      
      await ctx.runMutation(internal.scheduledTasks.markTaskRun, {
        taskId: args.taskId,
        success: false,
        result: error instanceof Error ? error.message : 'Unknown error',
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

// Helper query to get task by ID
export const getTaskById = internalQuery({
  args: {
    taskId: v.id('scheduledTasks'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

// Check and execute due tasks (called by cron every minute)
export const checkAndExecute = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log('[Scheduler] Checking for due tasks...');
    
    // Get all due tasks
    const dueTasks = await ctx.runQuery(internal.scheduledTasks.getDueTasks);
    
    if (dueTasks.length === 0) {
      console.log('[Scheduler] No tasks due');
      return { executed: 0 };
    }
    
    console.log(`[Scheduler] Found ${dueTasks.length} task(s) to execute`);
    
    // Execute each task
    const results = [];
    for (const task of dueTasks) {
      try {
        console.log(`[Scheduler] Executing: ${task.name}`);
        const result = await ctx.runAction(internal.scheduledTasks.executeTask, {
          taskId: task._id,
        });
        results.push({ taskId: task._id, name: task.name, ...result });
      } catch (error) {
        console.error(`[Scheduler] Failed to execute ${task.name}:`, error);
        results.push({ 
          taskId: task._id, 
          name: task.name, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return { executed: dueTasks.length, results };
  },
});

// Calculate next run time based on schedule
function calculateNextRun(schedule: any): number {
  const now = new Date();
  
  switch (schedule.type) {
    case 'daily': {
      const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);
      let next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }
    
    case 'weekly': {
      const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number);
      const dayOfWeek = schedule.dayOfWeek ?? 1; // Default to Monday
      
      let next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      
      const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7;
      if (daysUntilNext === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
      } else {
        next.setDate(next.getDate() + daysUntilNext);
      }
      return next.getTime();
    }
    
    case 'interval': {
      const minutes = schedule.intervalMinutes || 60;
      return now.getTime() + minutes * 60 * 1000;
    }
    
    default:
      return now.getTime() + 24 * 60 * 60 * 1000; // Default to 24h
  }
}
