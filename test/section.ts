import { Bot, Context, Section, SpoiledConverter, StringConverter } from "../src"
import { RichEmbed } from "discord.js"


const SectionNameConverter = new SpoiledConverter(new StringConverter(), {
    default: [""]
})

function CreateEmbed() {
    return new RichEmbed({
        title: "Help",
        description: "Help things"
    })
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
}

export function setup(bot: Bot) {
    bot.addSection(new Main({
        name: "Help Section",
        description: "Contains commands used for helping"
    }))
}