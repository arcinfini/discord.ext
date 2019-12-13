"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const secrets = require("./secrets");
const bot = new src_1.Bot("!");
bot.on("ready", () => {
    console.log("Bot is online");
});
bot.createCommand({
    name: "test"
}, async (context) => {
    await context.send("I am working");
});
bot.loadSection(__dirname, "section");
bot.run(secrets.token);
