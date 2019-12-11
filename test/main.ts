import {Extension} from "../src"

const secrets = require("./secrets")
const bot = new Extension.Bot("!")

bot.on("ready", () => {
    console.log("Bot is online")
})

bot.createCommand({
    name: "test"
}, async (context: Extension.Context) => {
    await context.send("I am working")
})

bot.loadSection(__dirname, "section")

bot.run(secrets.token)