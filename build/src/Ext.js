"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const Converters_1 = require("./Converters");
const discord_js_1 = require("discord.js");
const util_1 = require("util");
const path_1 = require("path");
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
            throw new _1.Errors.CommandExists(`command with name: ${properties.name} already exists`);
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
            if (error instanceof _1.Errors.SectionExists) {
                throw error;
            }
            else {
                throw new _1.Errors.SectionImplementationError(error.message);
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
            throw new _1.Errors.SectionExists(`section with name: ${section.name} already exists`);
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
exports.Bot = Bot;
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
exports.Section = Section;
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
            throw new _1.Errors.MisssingRequiredArgument(`required argument: ${name} missing`);
        }
        else if (util_1.isUndefined(value) && !util_1.isUndefined(converter.default)) {
            return converter.default;
        }
        let conversion = await converter.convert(this, value).catch((error) => {
            throw new _1.Errors.CommandImplementationError(`${name} failed to parse due to a converter error`);
        });
        if (conversion == undefined && !converter.optional) {
            throw new _1.Errors.BadArgument(`bad argument type for ${name}`);
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
            if (converter instanceof Converters_1.SpoiledConverter) {
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
            else if (converter instanceof Converters_1.OneofConverter) {
                conversion = await this.basicConversion(this.Segments[index++], converter, name);
                if (conversion === undefined) {
                    throw new _1.Errors.BadArgument(`expected one of ${converter.choices}`);
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
exports.Context = Context;
class Check {
    constructor(callback) {
        this.callback = callback;
    }
    async check(context) {
        let result = await this.callback(context);
        return result;
    }
}
exports.Check = Check;
class Command {
    constructor(bot, properties, callback) {
        if (properties.name.indexOf(" ") !== -1) {
            throw new _1.Errors.InvalidCommandName("a command name can not contain a space");
        }
        // Setting defaults
        if (!properties.format && properties.arguments) {
            let formatList = [];
            formatList.push(properties.name);
            for (let [key, value] of Object.entries(properties.arguments)) {
                // [] = optional // {} = multiple allowed // [{}] = optional multi-argument
                // [key = default]
                let [firstOpt, lastOpt] = (value.optional) ? ['[', ']'] : ['', ''];
                let [firstMulti, lastMulti] = (value instanceof Converters_1.SpoiledConverter) ? ['{', '}'] : ['', ''];
                let defaultVal = (value.default) ? ` = ${value.default}` : "";
                let push = `${firstOpt}${firstMulti}${key}${defaultVal}${lastMulti}${lastOpt}`;
                formatList.push(push);
            }
            properties.format = formatList.join(" ");
        }
        properties.description = properties.description || "No description";
        properties.hidden = (!util_1.isUndefined(properties.hidden)) ? false : properties.hidden;
        properties.checks = properties.checks || [];
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
                    throw new _1.Errors.CheckImplementationError(`check failed to process correctly in ${this.name}`);
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
            throw new _1.Errors.CheckError(`check failure`);
        }
        await this.callback(context, ...context.parameters);
    }
}
exports.Command = Command;
