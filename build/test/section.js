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
const SectionNameConverter = new src_1.SpoiledConverter(src_1.StringConverter, {
    default: [""]
});
function CreateEmbed() {
    return new discord_js_1.RichEmbed({
        title: "Help",
        description: "Help things"
    });
}
function botadmin() {
    return function (target, key) {
        console.log("registering bot admin");
        return src_1.Check.use(async (ctx) => {
            let botGuild = ctx.bot.guilds.get("583304765442883624");
            let member = await botGuild.fetchMember(ctx.author);
            let role = member.roles.get("583307007210291220");
            return role != undefined;
        })(target, key);
    };
}
class Main extends src_1.Section {
    async ready() {
        console.log("Section events work");
    }
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
    async test(ctx) {
        await ctx.send("Yes this is a dm");
    }
    async test1(ctx) {
        await ctx.send("Yes this is a guild");
    }
    async admin(ctx) {
        await ctx.send("hello admin");
    }
    async delete(ctx) {
        await ctx.message.delete();
    }
}
__decorate([
    src_1.Section.event()
], Main.prototype, "ready", null);
__decorate([
    src_1.Section.command({
        name: "help",
        description: "Provides help",
        arguments: { sectionName: SectionNameConverter }
    })
], Main.prototype, "help", null);
__decorate([
    src_1.Section.command({
        name: "testcheck1",
        description: "This command can only be called in DMs"
    }),
    src_1.Check.isDirectMessage()
], Main.prototype, "test", null);
__decorate([
    src_1.Section.command({
        name: "testcheck2",
        description: "This command can only be called in guilds"
    }),
    src_1.Check.isGuild()
], Main.prototype, "test1", null);
__decorate([
    botadmin(),
    src_1.Section.command({
        name: "admin",
        description: "only admins can use this"
    })
], Main.prototype, "admin", null);
__decorate([
    src_1.Section.command({
        name: "delete"
    }),
    botadmin(),
    src_1.Check.botHasPermissions(new discord_js_1.Permissions(discord_js_1.Permissions.FLAGS.MANAGE_MESSAGES))
], Main.prototype, "delete", null);
function setup(bot) {
    bot.addSection(new Main({
        name: "Help Section",
        description: "Contains commands used for helping"
    }));
}
exports.setup = setup;
