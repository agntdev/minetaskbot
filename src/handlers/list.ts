import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getTasks } from "../store.js";

registerMainMenuItem({ label: "📋 My Tasks", data: "list:show", order: 10 });

const composer = new Composer<Ctx>();

function formatTaskList(userId: string): { text: string; hasTasks: boolean } {
  const tasks = getTasks(userId);
  if (tasks.length === 0) {
    return { text: "No tasks yet — tap Add Task to create one.", hasTasks: false };
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const inProgress = tasks.filter((t) => t.status === "in-progress");
  const completed = tasks.filter((t) => t.status === "completed");

  const lines: string[] = [];
  if (inProgress.length > 0) {
    lines.push("In Progress:");
    lines.push(...inProgress.map((t) => `🔄 ${t.id}: ${t.title} (${t.progressPercent}%)`));
  }
  if (pending.length > 0) {
    lines.push("Pending:");
    lines.push(...pending.map((t) => `⬜ ${t.id}: ${t.title}`));
  }
  if (completed.length > 0) {
    lines.push("Completed:");
    lines.push(...completed.map((t) => `✅ ${t.id}: ${t.title}`));
  }

  return { text: lines.join("\n"), hasTasks: true };
}

composer.command("list", async (ctx) => {
  const userId = String(ctx.from!.id);
  const { text, hasTasks } = formatTaskList(userId);
  if (!hasTasks) {
    await ctx.reply(text, {
      reply_markup: inlineKeyboard([[inlineButton("➕ Add Task", "task:add:start")]]),
    });
    return;
  }
  const tasks = getTasks(userId);
  const rows = tasks.map((t) => {
    const icon = t.status === "completed" ? "✅" : t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:view:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply(text, { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery("list:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = String(ctx.from!.id);
  const { text, hasTasks } = formatTaskList(userId);
  if (!hasTasks) {
    await ctx.editMessageText(text, {
      reply_markup: inlineKeyboard([[inlineButton("➕ Add Task", "task:add:start")]]),
    });
    return;
  }
  const tasks = getTasks(userId);
  const rows = tasks.map((t) => {
    const icon = t.status === "completed" ? "✅" : t.status === "in-progress" ? "🔄" : "⬜";
    return [inlineButton(`${icon} ${t.title}`, `task:view:${t.id}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText(text, { reply_markup: inlineKeyboard(rows) });
});

export default composer;
