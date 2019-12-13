"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const util_1 = require("util");
const path_1 = require("path");
var Extension;
(function (Extension) {
    class Bot extends discord_js_1.Client {
        constructor(prefix, options) {
            super(options);
            this.Sections = new discord_js_1.Collection();
            this.Commands = new discord_js_1.Collection();
            this.Checks = [];
            this.CommandErrorCallbacks = [];
            this.Prefix = prefix;
            super.on("message", async (message) => {
                let context = new Context(this, message);
                if (!context.valid) {
                    return;
                }
                await context.prepare().catch((err) => {
                    this.fireCommandErrorCallbacks(context, err);
                });
                if (!context.prepared) {
                    return;
                }
                context.command.invoke(context).catch((err) => {
                    this.fireCommandErrorCallbacks(context, err);
                });
            });
        }
        get checks() { return Object.assign([], this.Checks); }
        get commands() { return this.Commands; }
        get sections() { return this.Sections; }
        /**Calls all the onCommandErrorCallbacks in parallel */
        fireCommandErrorCallbacks(ctx, error) {
            if (this.CommandErrorCallbacks.length == 0) {
                console.error(error);
            }
            for (let callback of this.CommandErrorCallbacks) {
                this.setTimeout(callback, 0, ctx, error);
            }
        }
        /**Retrieves the prefix of the bot in relation to the message passed*/
        getPrefix(message) {
            if (typeof (this.Prefix) === "function") {
                return this.Prefix(this, message);
            }
            return this.Prefix;
        }
        /**Adds a command to be listened for when a message is sent */
        createCommand(properties, callback) {
            if (this.hasCommand(properties.name)) {
                throw new Errors.CommandExists(`command with name: ${properties.name} already exists`);
            }
            let command = new Command(this, properties, callback);
            this.Commands.set(properties.name, command);
            if (!util_1.isUndefined(command.section)) {
                command.section.addCommand(command);
            }
        }
        /**Returns a command based on its name */
        getCommand(commandName) {
            return this.Commands.get(commandName);
        }
        /**Returns if a command exists based on its name */
        hasCommand(commandName) {
            return !util_1.isUndefined(this.getCommand(commandName));
        }
        /**Loads a section for the bot to listen for its commands */
        loadSection(dir, modulePath) {
            try {
                require(path_1.join(dir, modulePath)).setup(this);
            }
            catch (error) {
                if (error instanceof Errors.SectionExists) {
                    throw error;
                }
                else {
                    throw new Errors.SectionImplementationError(error.message);
                }
            }
        }
        /**Called when setting up a section
         *
         * This specifically finds all methods in the Section that
         * are considered a command method
         */
        addSection(section) {
            if (this.hasSection(section.name)) {
                throw new Errors.SectionExists(`section with name: ${section.name} already exists`);
            }
            this.Sections.set(section.name, section);
            const loadCommand = (properties, method) => {
                properties.section = section;
                try { // Catches any errors when creating to prevent an error breaking the entire section
                    this.createCommand(properties, method);
                }
                catch (e) {
                    console.error(e);
                }
            };
            const loadEvent = (properties, method) => {
                try { // Catches any errors when creating to prevent an error breaking the entire section
                    this.on(properties.name, method);
                }
                catch (e) {
                    console.error(e);
                }
            };
            let propertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf(section));
            for (let methodName of propertyNames) {
                let method = section[methodName];
                let commandProperties = method.commandProperties;
                let eventProperties = method.eventProperties;
                if (commandProperties) {
                    loadCommand(commandProperties, method);
                }
                if (eventProperties) {
                    loadEvent(eventProperties, method);
                }
            }
        }
        /**Returns a section based on its name */
        getSection(sectionName) {
            return this.Sections.get(sectionName);
        }
        /**Returns if a section exists based on its name */
        hasSection(sectionName) {
            return !util_1.isUndefined(this.getSection(sectionName));
        }
        /**Adds a check that will be checked on every command */
        addCheck(check) {
            this.Checks.push(check);
        }
        /**Checks if the command can proceed with the context */
        async check(context) {
            for (let check of this.Checks) {
                if (!await check.check(context)) {
                    return false;
                }
            }
            return true;
        }
        /**Adds a callback to be called when a command errors
         *
         * All errors either derive from CommandError or are caused by
         * the command callback
         *
         * The arguments in context may be incomplete depending on the situation
         */
        onCommandError(callback) {
            this.CommandErrorCallbacks.push(callback);
        }
        run(token) {
            this.login(token);
        }
    }
    Extension.Bot = Bot;
    class Section {
        constructor(properties) {
            this.Commands = new discord_js_1.Collection();
            this.Properties = properties;
        }
        /**A decorator that defines the method as a command
         *
         * If no properties are provided then the required name property
         * will be interpreted as the method name
         */
        static command(properties) {
            return function (target, propertyKey, descriptor) {
                target[propertyKey].commandProperties = properties || { name: propertyKey };
                return target;
            };
        }
        static event(eventName) {
            return function (target, propertyKey) {
                target[propertyKey].eventProperties = {
                    name: eventName || propertyKey
                };
                return target;
            };
        }
        get name() { return this.Properties.name; }
        get description() { return this.Properties.description; }
        get checks() { return Object.assign([], this.Properties.checks); }
        get commands() { return this.Commands; }
        addCommand(command) {
            this.Commands.set(command.name, command);
        }
        getCommand(name) {
            return this.Commands.get(name);
        }
        hasCommand(name) {
            return !util_1.isUndefined(this.getCommand(name));
        }
        async check(context) {
            for (let check of this.checks) {
                if (!await check.check(context)) {
                    return false;
                }
            }
            return true;
        }
    }
    Extension.Section = Section;
    class Context {
        constructor(bot, message) {
            this.Prepared = false;
            this.valid = false;
            if (message.system) {
                return; /*will never be command*/
            }
            let content = message.content;
            let prefix = bot.getPrefix(message);
            if (!content.startsWith(prefix)) {
                return; // message is not a command error
            }
            content = content.replace(prefix, '');
            let segments = content.split(' ');
            let command = bot.getCommand(segments[0]);
            if (command == undefined) {
                return; // message is not an existing command
            }
            this.author = message.author;
            this.message = message;
            this.guild = message.guild;
            this.channel = message.channel;
            this.bot = bot;
            this.prefix = prefix;
            this.command = command;
            this.Segments = segments.splice(1, segments.length - 1);
            this.valid = true;
        }
        async basicConversion(value, converter, name) {
            if (util_1.isUndefined(value) && !converter.optional) {
                throw new Errors.MisssingRequiredArgument(`${name} missing from ${this.command.name} arguments`);
            }
            else if (util_1.isUndefined(value) && !util_1.isUndefined(converter.default)) {
                return converter.default;
            }
            let conversion = await converter.convert(this, value).catch((error) => {
                throw new Errors.BadArgument(`${name} failed to parse`);
            });
            if (util_1.isUndefined(conversion) || conversion === null) {
                throw new Errors.MisssingRequiredArgument(`${name} missing from ${this.command.name} arguments`);
            }
            return conversion;
        }
        /**Prepares the context to be used for a command */
        async prepare() {
            if (this.Prepared) {
                return;
            }
            this.Arguments = {};
            this.Parameters = [];
            let index = 0;
            for (let [name, converter] of Object.entries(this.command.arguments)) {
                let conversion;
                if (converter instanceof Converters.SpoiledConverter) {
                    conversion = [];
                    let cont = true;
                    while (cont) {
                        let value = await this.basicConversion(this.Segments[index++], converter, name).catch((err) => {
                            cont = false;
                        });
                        if (!util_1.isUndefined(value)) {
                            conversion.push(value);
                        }
                    }
                    if (conversion.length == 0 && !util_1.isUndefined(converter.default)) {
                        conversion = converter.defaultS;
                    }
                }
                else {
                    conversion = await this.basicConversion(this.Segments[index++], converter, name);
                }
                this.Arguments[name] = conversion;
                this.Parameters.push(conversion);
            }
            this.Prepared = true;
        }
        get arguments() { return this.Arguments; }
        get parameters() { return this.Parameters; }
        get prepared() { return this.Prepared; }
        get hasGuild() { return this.guild instanceof discord_js_1.Guild; }
        async send(content, options) {
            await this.channel.send(content, options);
        }
    }
    Extension.Context = Context;
    class Check {
        constructor(callback) {
            this.callback = callback;
        }
        async check(context) {
            let result = await this.callback(context);
            return result;
        }
    }
    Extension.Check = Check;
    class Command {
        constructor(bot, properties, callback) {
            if (properties.name.indexOf(" ") !== -1) {
                throw new Errors.InvalidCommandName("a command name can not contain a space");
            }
            // Inserts a default format based on the commands arguments if there are any
            if (!properties.format && properties.arguments) {
                let formatList = [];
                formatList.push(properties.name);
                for (let [key, value] of Object.entries(properties.arguments)) {
                    // [] = optional // {} = multiple allowed
                    // [key = default]
                    let [first, last] = (value.optional) ? ['[', ']'] : ['{', '}'];
                    let defaultVal = (value.default) ? ` = ${value.default}` : "";
                    let push = `${first}${key}${defaultVal}${last}`;
                    formatList.push(push);
                }
                properties.format = formatList.join(" ");
            }
            this.properties = properties;
            this.callback = callback;
        }
        get name() { return this.properties.name; }
        get arguments() { return Object.assign({}, this.properties.arguments); }
        get description() { return this.properties.description; }
        get format() { return this.properties.format; }
        get hidden() { return this.properties.hidden; }
        get section() { return this.properties.section; }
        get checks() { return Object.assign([], this.properties.checks); }
        /**Tests the context if the command can be used */
        async canUse(context) {
            let list = [context.bot, this.section, this];
            for (let obj of list) {
                if (util_1.isUndefined(obj)) {
                    continue;
                } // When there is no section
                for (let check of obj.checks) {
                    let result = await check.check(context).catch(() => { });
                    if (util_1.isUndefined(result)) {
                        throw new Errors.CheckImplementationError(`check failed to process correctly in ${this.name}`);
                    }
                    else if (!result) {
                        return false;
                    }
                }
            }
            return true;
        }
        async invoke(context) {
            if (this !== context.command) {
                throw Error("invalid context given");
            }
            let canUse = await this.canUse(context);
            if (!canUse) {
                throw new Errors.CheckError(`check failure`);
            }
            await this.callback(context, ...context.parameters);
        }
    }
    Extension.Command = Command;
    /**
    
    Converters are used to convert arguments into useable values

    */
    let Converters;
    (function (Converters) {
        class Converter {
            constructor(options = {}) {
                this.optional = (util_1.isUndefined(options.optional)) ? false : options.optional;
                this.default = options.default;
                if (!util_1.isUndefined(this.default)) {
                    this.optional = true;
                }
            }
        }
        Converters.Converter = Converter;
        /**Converts an argument to a number */
        class NumberConverter extends Converter {
            convert(context, argument) {
                let conversion = Number(argument);
                return (isNaN(conversion)) ? undefined : conversion;
            }
        }
        Converters.NumberConverter = NumberConverter;
        /**Converts an argument to a string */
        class StringConverter extends Converter {
            async convert(context, argument) {
                return argument;
            }
        }
        Converters.StringConverter = StringConverter;
        class UserConverter extends Converter {
            async convert(context, argument) {
                let user;
                // Check if it is a mention
                let idMatch = argument.match("^<@!?([0-9]+)>$");
                if (idMatch) {
                    user = await context.bot.fetchUser(idMatch[1]).catch(() => { });
                    if (user) {
                        return user;
                    }
                }
                // Check if it is a number : ID
                let id = Number(argument);
                if (util_1.isNumber(id)) {
                    user = await context.bot.fetchUser(id.toString()).catch(() => { });
                    if (user) {
                        return user;
                    }
                }
                return undefined;
            }
        }
        Converters.UserConverter = UserConverter;
        class MemberConverter extends Converter {
            async convert(context, argument) {
                let userConverter = new UserConverter({ optional: true });
                let user = await userConverter.convert(context, argument);
                if (util_1.isUndefined(user) && context.hasGuild) {
                    user = context.guild.members.find((member) => {
                        let u = member.user;
                        let username = u.username;
                        if (`${username}#${u.discriminator}` === argument) {
                            return true;
                        }
                        if (username === argument) {
                            return true;
                        }
                        if (member.displayName === argument) {
                            return true;
                        }
                        return false;
                    });
                }
                return (util_1.isUndefined(user)) ? undefined : context.guild.member(user);
            }
        }
        Converters.MemberConverter = MemberConverter;
        class GuildConverter extends Converter {
            async convert(context, argument) {
                return context.bot.guilds.get(argument);
            }
        }
        Converters.GuildConverter = GuildConverter;
        class RoleConverter extends Converter {
            async convert(context, argument) {
                // Mention
                let roleMention = argument.match("^<@&([0-9]+)>$");
                if (roleMention && context.hasGuild) {
                    let role = context.guild.roles.get(roleMention[1]);
                    if (role) {
                        return role;
                    }
                }
                // id
                let idMatch = argument.match("^([0-9]+)$");
                if (idMatch && context.hasGuild) {
                    let role = context.guild.roles.get(idMatch[1]);
                    if (role) {
                        return role;
                    }
                }
                // guildid-roleid
                let guildRoleId = argument.match("^([0-9]+)-([0-9]+)$");
                if (guildRoleId) {
                    let guildId = guildRoleId[1];
                    let guild = context.bot.guilds.get(guildId);
                    if (guild) {
                        let role = context.guild.roles.get(guildRoleId[2]);
                        if (role) {
                            return role;
                        }
                    }
                }
                // name
                if (context.hasGuild) {
                    let role = context.guild.roles.find((role) => {
                        return role.name == argument;
                    });
                    if (role) {
                        return role;
                    }
                }
                return undefined;
            }
        }
        Converters.RoleConverter = RoleConverter;
        class GuildChannelConverter extends Converter {
            async convert(context, argument) {
                // Mention
                let channelMention = argument.match("^<#([0-9]+)>$");
                if (channelMention && context.hasGuild) {
                    let channel = context.guild.channels.get(channelMention[1]);
                    if (channel) {
                        return channel;
                    }
                }
                // Id
                let idMatch = argument.match("^([0-9]+)$");
                if (idMatch && context.hasGuild) {
                    let channel = context.guild.channels.get(idMatch[1]);
                    if (channel) {
                        return channel;
                    }
                }
                // guildid-channelid
                let guildChannelId = argument.match("^([0-9]+)-([0-9]+)$");
                if (guildChannelId) {
                    let guildId = guildChannelId[1];
                    let guild = context.bot.guilds.get(guildId);
                    let channel = guild.channels.get(guildChannelId[2]);
                    if (channel) {
                        return channel;
                    }
                }
                // name
                if (context.hasGuild) {
                    let channel = context.guild.channels.find((channel) => {
                        return channel.name == argument;
                    });
                    if (channel) {
                        return channel;
                    }
                }
                return undefined;
            }
        }
        Converters.GuildChannelConverter = GuildChannelConverter;
        class MessageConverter extends Converter {
            async getMessageInChannel(guild, channelId, messageId) {
                let channel = guild.channels.get(channelId);
                if (channel) {
                    let message = await channel.fetchMessage(messageId).catch(() => { });
                    return message;
                }
            }
            async convert(context, argument) {
                // Message id
                let messageId = argument.match("^([0-9]+)$");
                if (messageId) {
                    let message = await context.channel.fetchMessage(messageId[1]).catch(() => { });
                    if (message) {
                        return message;
                    }
                }
                // {channelid}-{messageid}
                let channelMessageId = argument.match("^([0-9]+)-([0-9]+)$");
                if (channelMessageId && context.hasGuild) {
                    let message = await this.getMessageInChannel(context.guild, channelMessageId[1], channelMessageId[2]);
                    if (message) {
                        return message;
                    }
                }
                // Message link
                let messageLink = argument.match("([0-9]+)\/([0-9]+)\/([0-9]+)$");
                if (messageLink) {
                    let guildId = messageLink[1];
                    let guild = context.bot.guilds.get(guildId);
                    if (guild) {
                        let message = await this.getMessageInChannel(guild, messageLink[2], messageLink[3]).catch(() => { });
                        if (message) {
                            return message;
                        }
                    }
                }
                return undefined;
            }
        }
        Converters.MessageConverter = MessageConverter;
        /**
         * A special type of converter that attempts to convert as many values as possible
         *
         * This converter will not stop converting arguments until it meets an error.
         * Be careful when using this as it may convert more than expected
         *
         * This converter does not support the optional option as it will always insert a list
         */
        class SpoiledConverter extends Converter {
            constructor(converter, options = {}) {
                super({ optional: false });
                this.converter = converter;
                this.defaultS = options.default;
            }
            async convert(context, argument) {
                return await this.converter.convert(context, argument);
            }
        }
        Converters.SpoiledConverter = SpoiledConverter;
    })(Converters = Extension.Converters || (Extension.Converters = {}));
    let Errors;
    (function (Errors) {
        class SectionError extends Error {
        }
        Errors.SectionError = SectionError;
        /**Thrown when trying to create a section with an existing name */
        class SectionExists extends SectionError {
        }
        Errors.SectionExists = SectionExists;
        /**Thrown when a section fails to load correctly or is implemented incorrectly */
        class SectionImplementationError extends SectionError {
        }
        Errors.SectionImplementationError = SectionImplementationError;
        class CommandError extends Error {
        }
        Errors.CommandError = CommandError;
        /**Thrown when a command name is invalid (contains spaces) */
        class InvalidCommandName extends CommandError {
        }
        Errors.InvalidCommandName = InvalidCommandName;
        /**Thrown when trying to create a command with an existing name */
        class CommandExists extends CommandError {
        }
        Errors.CommandExists = CommandExists;
        /**Thrown when a check returns a false like value */
        class CheckError extends CommandError {
        }
        Errors.CheckError = CheckError;
        /**Thrown when a check errors */
        class CheckImplementationError extends CommandError {
        }
        Errors.CheckImplementationError = CheckImplementationError;
        /**Thrown when a user-made callback throws an error */
        class CommandImplementationError extends CommandError {
        }
        Errors.CommandImplementationError = CommandImplementationError;
        class ArgumentError extends CommandError {
        }
        Errors.ArgumentError = ArgumentError;
        /**Thrown when context fails to parse an argument  */
        class BadArgument extends ArgumentError {
        }
        Errors.BadArgument = BadArgument;
        /**Thrown when there are less arguments than required */
        class MisssingRequiredArgument extends ArgumentError {
        }
        Errors.MisssingRequiredArgument = MisssingRequiredArgument;
        /**Thrown when there are too many arguments */
        class TooManyArguments extends ArgumentError {
        }
        Errors.TooManyArguments = TooManyArguments;
    })(Errors = Extension.Errors || (Extension.Errors = {}));
})(Extension = exports.Extension || (exports.Extension = {}));
