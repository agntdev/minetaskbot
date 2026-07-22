import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getTask, updateTask } from "../store.js";

const composer = new Composer<Ctx>();

function formatTaskDetail(task: { id: string; title: string; description: string; startTimestamp: number; estimatedDuration: string; progressPercent: number; status: string }): string {
  const lines = [
    `📋 ${task.id}: ${task.title}`,
    `Status: ${task.status}`,
    `Progress: ${task.progressPercent}%`,
  ];
  if (task.description) lines.push(`Description: ${task.description}`);
  if (task.estimatedDuration) lines.push(`Duration: ${task.estimatedDuration}`);
  lines.push(`Started: ${new Date(task.startTimestamp).toLocaleDateString()}`);
  return lines.join("\n");
}

function taskActionsKeyboard(taskId: string) {
  return {
    reply_markup: inlineKeyboard([
      [inlineButton("📊 Update Progress", `task:progress:${taskId}`)],
      [inlineButton("⏰ Set Reminder", `task:remind:${taskId}`)],
      [inlineButton("✅ Mark Done", `task:done:${taskId}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  };
}

composer.command("view", async (ctx) => {
  const userId = String(ctx.from!.id);
  const { getTasks } = await import("../store.js");
  const tasks = getTasks(userId);
  if (tasks.length === 0) {
    await ctx.reply("No tasks to view — tap Add Task to create one.", {
      reply_markup: inlineKeyboard([[inlineButton("➕ Add Task", "task:add:start")]]),
    });
    return;
  }
  const rows = tasks.map((t) => {
    const icon = t.status === "completed" ? "✅" : t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:view:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply("Select a task to view:", { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery(/^task:view:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const taskId = ctx.match[1];
  const userId = String(ctx.from!.id);
  const task = getTask(userId, taskId);
  if (!task) {
    await ctx.editMessageText("Task not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.editMessageText(formatTaskDetail(task), taskActionsKeyboard(taskId));
});

composer.callbackQuery(/^task:progress:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const taskId = ctx.match[1];
  const keyboard = inlineKeyboard([
    [
      inlineButton("10%", `task:setprogress:${taskId}:10`),
      inlineButton("25%", `task:setprogress:${taskId}:25`),
      inlineButton("50%", `task:setprogress:${taskId}:50`),
    ],
    [
      inlineButton("75%", `task:setprogress:${taskId}:75`),
      inlineButton("100%", `task:setprogress:${taskId}:100`),
    ],
    [inlineButton("⬅️ Back", `task:view:${taskId}`)],
  ]);
  await ctx.editMessageText("Select progress:", { reply_markup: keyboard });
});

composer.callbackQuery(/^task:setprogress:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const taskId = ctx.match[1];
  const percent = parseInt(ctx.match[2], 10);
  const userId = String(ctx.from!.id);
  const status = percent >= 100 ? "completed" : percent > 0 ? "in-progress" : "pending";
  const task = updateTask(userId, taskId, { progressPercent: percent, status });
  if (!task) {
    await ctx.editMessageText("Task not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.editMessageText(`Progress updated to ${percent}%`, taskActionsKeyboard(taskId));
});

export { formatTaskDetail, taskActionsKeyboard };
export default composer;
