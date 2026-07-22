import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getTask, addReminder, getTasks } from "../store.js";

registerMainMenuItem({ label: "⏰ Reminders", data: "remind:show", order: 40 });

const composer = new Composer<Ctx>();

function parseRelativeTime(input: string): number | null {
  const match = input.match(/^in\s+(\d+)\s*(m|min|h|hr|hour|d|day)s?$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = unit === "m" || unit === "min" ? n * 60_000
    : unit === "h" || unit === "hr" || unit === "hour" ? n * 3_600_000
    : unit === "d" || unit === "day" ? n * 86_400_000
    : null;
  return ms !== null ? Date.now() + ms : null;
}

composer.command("remind", async (ctx) => {
  const userId = String(ctx.from!.id);
  const tasks = getTasks(userId).filter((t) => t.status !== "completed");
  if (tasks.length === 0) {
    await ctx.reply("No active tasks to set reminders for.", {
      reply_markup: inlineKeyboard([[inlineButton("➕ Add Task", "task:add:start")]]),
    });
    return;
  }
  const rows = tasks.map((t) => {
    const icon = t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:remind:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply("Select a task to set a reminder:", { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery("remind:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = String(ctx.from!.id);
  const tasks = getTasks(userId).filter((t) => t.status !== "completed");
  if (tasks.length === 0) {
    await ctx.editMessageText("No active tasks to set reminders for.", {
      reply_markup: inlineKeyboard([[inlineButton("➕ Add Task", "task:add:start")]]),
    });
    return;
  }
  const rows = tasks.map((t) => {
    const icon = t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:remind:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Select a task to set a reminder:", { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery(/^task:remind:(.+)$/, async (ctx) => {
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
  ctx.session.reminderTaskId = taskId;
  ctx.session.step = "remind:time";
  await ctx.reply(`When should I remind you about "${task.title}"?\nType a time like "in 2h" or "in 30m".`, {
    reply_markup: { force_reply: true, input_field_placeholder: "e.g. in 2h" },
  });
});

composer.callbackQuery(/^task:remindrepeat:(.+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const taskId = ctx.match[1];
  const repeat = ctx.match[2] as "none" | "daily" | "weekly";
  const userId = String(ctx.from!.id);
  const reminders = (await import("../store.js")).getReminders(userId);
  const pending = reminders.find((r) => r.taskId === taskId && r.repeat === "none");
  if (pending) {
    const updated = { ...pending, repeat };
    const store = await import("../store.js");
    store.removeReminder(userId, pending.id);
    store.addReminder(userId, { taskId: updated.taskId, time: updated.time, repeat: updated.repeat });
  }
  ctx.session.step = undefined;
  ctx.session.reminderTaskId = undefined;
  await ctx.editMessageText("Reminder set!", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "remind:time") return next();
  const text = ctx.message.text.trim();
  const timeMs = parseRelativeTime(text);
  if (timeMs === null) {
    await ctx.reply("Couldn't parse that time. Try \"in 2h\" or \"in 30m\".");
    return;
  }
  const reminderTime = timeMs;
  const taskId = ctx.session.reminderTaskId ?? "";
  const userId = String(ctx.from!.id);
  addReminder(userId, { taskId, time: reminderTime, repeat: "none" });
  ctx.session.step = "remind:repeat";
  await ctx.reply("How often should I repeat?", {
    reply_markup: inlineKeyboard([
      [inlineButton("Once", `task:remindrepeat:${taskId}:none`)],
      [inlineButton("Daily", `task:remindrepeat:${taskId}:daily`)],
      [inlineButton("Weekly", `task:remindrepeat:${taskId}:weekly`)],
    ]),
  });
});

export { parseRelativeTime };
export default composer;
