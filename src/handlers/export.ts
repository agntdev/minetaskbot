import { Composer, InputFile } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getTasks } from "../store.js";

registerMainMenuItem({ label: "📥 Export", data: "export:csv", order: 50 });

const composer = new Composer<Ctx>();

function generateCsv(userId: string): string {
  const tasks = getTasks(userId);
  const header = "ID,Title,Description,Status,Progress,Duration,Started";
  const rows = tasks.map((t) =>
    [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      t.status,
      `${t.progressPercent}%`,
      t.estimatedDuration || "",
      new Date(t.startTimestamp).toISOString(),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

composer.command("export", async (ctx) => {
  const userId = String(ctx.from!.id);
  const tasks = getTasks(userId);
  if (tasks.length === 0) {
    await ctx.reply("No tasks to export.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const csv = generateCsv(userId);
  const buffer = Buffer.from(csv, "utf-8");
  await ctx.replyWithDocument(
    new InputFile(buffer, "tasks.csv"),
    { caption: `Exported ${tasks.length} task(s).` },
  );
});

composer.callbackQuery("export:csv", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = String(ctx.from!.id);
  const tasks = getTasks(userId);
  if (tasks.length === 0) {
    await ctx.editMessageText("No tasks to export.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const csv = generateCsv(userId);
  const buffer = Buffer.from(csv, "utf-8");
  await ctx.replyWithDocument(
    new InputFile(buffer, "tasks.csv"),
    { caption: `Exported ${tasks.length} task(s).` },
  );
});

export default composer;
