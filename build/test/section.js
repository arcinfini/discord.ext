"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const discord_js_1 = require("discord.js");
const Section = src_1.Extension.Section;
const Converters = src_1.Extension.Converters;
const SectionNameConverter = new Converters.SpoiledConverter(new Converters.StringConverter(), {
    default: [""]
});
function CreateEmbed() {
    return new discord_js_1.RichEmbed({
        title: "Help",
        description: "Help things"
    });
}
class Main extends Section {
    async help(context, sectionArg) {
        let sectionName = sectionArg.join(" ");
        let section = context.bot.getSection(sectionName);
        let embed = CreateEmbed();
        if (section) {
            section.commands.forEach((command) => {
                embed.addField(command.name, `${command.description}\n${command.format}`);
            });
        }
        else {
            context.bot.sections.forEach((section) => {
                embed.addField(section.name, section.description);
            });
        }
        await context.send(undefined, embed);
    }
}
__decorate([
    Section.command({
        name: "help",
        description: "Provides help",
        arguments: { sectionName: SectionNameConverter }
    })
], Main.prototype, "help", null);
function setup(bot) {
    bot.addSection(new Main({
        name: "Help Section",
        description: "Contains commands used for helping"
    }));
}
exports.setup = setup;
