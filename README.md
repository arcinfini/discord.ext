# discord.ext
A wrapper for discord.js that allows for the creation and organization of commands. This wrapper is built for Typescript, but
it can also be used in Javascript.

This was built for a school project and personal intrest. I had no previous knowledge of JS or TS and I don't plan to update this in the future.

Drastically changes the way discord.js is used.

*examples are in TypeScript*
## Main File Example
Here is an example of what the main script would look like
```Typescript
import { Bot, Context } from "discord.ext"

const commandPrefix = "!"
const bot = new Bot(commandPrefix)

bot.on("ready", () => {
    console.log(`${bot.user.username} is online`)
})

// Creates a command to be used by sending !ping
bot.createCommand({
    name: "ping"
}, async (ctx: Context) => {
    await ctx.send("pong")
})

bot.run(token)
```

## Section Example
Here is an example of what a section and arguments would look like
```Typescript
import { Section, Context, SpoiledConverter, StringConverter } from "discord.ext"

const textConverter = new SpoiledConverter(StringConverter, {
    default: [""]
})

class Main extends Section {
    @Section.command({
        name: "say",
        arguments: {text: textConverter}
    })
    public async say(ctx: Context, text: string[]) {
        let respond = text.join(" ")
        if (respond.length > 0) {
            await ctx.send(respond)
        }
    }
}

export function setup(bot) {
    bot.addSection(new Main({
        name: "Example Section"
    }))
}
```
