import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getTask, updateTask, getTasks } from "../store.js";

registerMainMenuItem({ label: "✅ Mark Done", data: "done:show", order: 30 });

const composer = new Composer<Ctx>();

composer.command("done", async (ctx) => {
  const userId = String(ctx.from!.id);
  const tasks = getTasks(userId).filter((t) => t.status !== "completed");
  if (tasks.length === 0) {
    await ctx.reply("No pending tasks to mark done.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const rows = tasks.map((t) => {
    const icon = t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:done:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply("Select a task to mark as done:", { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery("done:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = String(ctx.from!.id);
  const tasks = getTasks(userId).filter((t) => t.status !== "completed");
  if (tasks.length === 0) {
    await ctx.editMessageText("No pending tasks to mark done.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const rows = tasks.map((t) => {
    const icon = t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:done:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Select a task to mark as done:", { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery(/^task:done:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const taskId = ctx.match[1];
  const userId = String(ctx.from!.id);
  const task = updateTask(userId, taskId, { status: "completed", progressPercent: 100 });
  if (!task) {
    await ctx.editMessageText("Task not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.editMessageText(`✅ ${task.id} marked as done!`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
