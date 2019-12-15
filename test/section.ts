import { Bot, Context, Section, SpoiledConverter, StringConverter, Check } from "../src"
import { RichEmbed, Permissions } from "discord.js"


const SectionNameConverter = new SpoiledConverter(StringConverter, {
    default: [""]
})

function CreateEmbed() {
    return new RichEmbed({
        title: "Help",
        description: "Help things"
    })
}

function botadmin() {
    return function (target, key) {
        return Check.use(async (ctx: Context) => {
            let botGuild = ctx.bot.guilds.get("583304765442883624")
            let member = await botGuild.fetchMember(ctx.author)
            let role = member.roles.get("583307007210291220")
            return role != undefined
        })(target, key)
    }
}

class Main extends Section {
    @Section.event()
    public async ready() {
        console.log("Section events work")
    }
    
    @Section.command({
        name: "help",
        description: "Provides help",
        arguments: {sectionName: SectionNameConverter}
    })
    public async help(context: Context, sectionArg: string[]) {
        let sectionName = sectionArg.join(" ")
        let section = context.bot.getSection(sectionName)
        let embed = CreateEmbed()
        if (section) {
            section.commands.forEach((command) => {
                embed.addField(command.name, `${command.description}\n${command.format}`)
            })
        } else {
            context.bot.sections.forEach((section) => {
                embed.addField(section.name, section.description)
            })
        }
        await context.send(undefined, embed)
    }

    @Section.command({
        name: "testcheck1",
        description: "This command can only be called in DMs"
    })
    @Check.isDirectMessage()
    public async test(ctx: Context) {
        await ctx.send("Yes this is a dm")
    }

    @Section.command({
        name: "testcheck2",
        description: "This command can only be called in guilds"
    })
    @Check.isGuild()
    public async test1(ctx: Context) {
        await ctx.send("Yes this is a guild")
    }

    @botadmin()
    @Section.command({
        name: "admin",
        description: "only admins can use this"
    })
    public async admin(ctx: Context) {
        await ctx.send("hello admin")
    }

    @Section.command({
        name: "delete"
    })
    @botadmin()
    @Check.botHasPermissions(new Permissions(Permissions.FLAGS.MANAGE_MESSAGES))
    public async delete(ctx: Context) {
        await ctx.message.delete()
    }
}

export function setup(bot: Bot) {
    bot.addSection(new Main({
        name: "Help Section",
        description: "Contains commands used for helping"
    }))
}