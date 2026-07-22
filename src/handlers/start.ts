import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getTasks } from "../store.js";

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome! Tap a button below to get started.";

function formatTaskSummary(userId: string): string {
  const tasks = getTasks(userId);
  if (tasks.length === 0) {
    return "No tasks yet — tap Add Task to create one.";
  }
  const recent = tasks.slice(-5).reverse();
  return "Recent tasks:\n" + recent.map((t) => {
    const icon = t.status === "completed" ? "✅" : t.status === "in-progress" ? "🔄" : "⬜";
    return `${icon} ${t.id}: ${t.title}`;
  }).join("\n");
}

composer.command("start", async (ctx) => {
  const userId = String(ctx.from!.id);
  const text = `${WELCOME}\n\n${formatTaskSummary(userId)}`;
  await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = String(ctx.from!.id);
  const text = `${WELCOME}\n\n${formatTaskSummary(userId)}`;
  await ctx.editMessageText(text, { reply_markup: mainMenuKeyboard() });
});

export default composer;
