import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { addTask } from "../store.js";

registerMainMenuItem({ label: "➕ Add Task", data: "task:add:start", order: 5 });

const composer = new Composer<Ctx>();

composer.command("add", async (ctx) => {
  ctx.session.step = "add:title";
  await ctx.reply("What's the task title?", {
    reply_markup: { force_reply: true, input_field_placeholder: "Task title" },
  });
});

composer.callbackQuery("task:add:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "add:title";
  await ctx.reply("What's the task title?", {
    reply_markup: { force_reply: true, input_field_placeholder: "Task title" },
  });
});

composer.callbackQuery("task:skip:desc", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.addDescription = "";
  ctx.session.step = "add:duration";
  await ctx.reply("Estimated duration? (e.g. 2h, 30m — or skip)", {
    reply_markup: inlineKeyboard([[inlineButton("⏭ Skip", "task:skip:duration")]]),
  });
});

composer.callbackQuery("task:skip:duration", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.addDuration = "";
  const userId = String(ctx.from!.id);
  const task = addTask(userId, {
    title: ctx.session.addTitle ?? "Untitled",
    description: ctx.session.addDescription ?? "",
    estimatedDuration: "",
  });
  ctx.session.step = undefined;
  ctx.session.addTitle = undefined;
  ctx.session.addDescription = undefined;
  ctx.session.addDuration = undefined;
  await ctx.editMessageText(`Task created: ${task.id} — ${task.title}`, {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;
  if (!step?.startsWith("add:")) return next();

  const text = ctx.message.text.trim();

  if (step === "add:title") {
    if (!text) {
      await ctx.reply("Title can't be empty — try again.");
      return;
    }
    ctx.session.addTitle = text;
    ctx.session.step = "add:description";
    await ctx.reply("Add a description? (or skip)", {
      reply_markup: inlineKeyboard([[inlineButton("⏭ Skip", "task:skip:desc")]]),
    });
    return;
  }

  if (step === "add:description") {
    ctx.session.addDescription = text;
    ctx.session.step = "add:duration";
    await ctx.reply("Estimated duration? (e.g. 2h, 30m — or skip)", {
      reply_markup: inlineKeyboard([[inlineButton("⏭ Skip", "task:skip:duration")]]),
    });
    return;
  }

  if (step === "add:duration") {
    ctx.session.addDuration = text;
    const userId = String(ctx.from!.id);
    const task = addTask(userId, {
      title: ctx.session.addTitle ?? "Untitled",
      description: ctx.session.addDescription ?? "",
      estimatedDuration: text,
    });
    ctx.session.step = undefined;
    ctx.session.addTitle = undefined;
    ctx.session.addDescription = undefined;
    ctx.session.addDuration = undefined;
    await ctx.reply(`Task created: ${task.id} — ${task.title}`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  return next();
});

export default composer;
