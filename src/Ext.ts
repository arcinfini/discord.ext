import { Errors } from "."
import { Converter, SpoiledConverter, OneofConverter } from "./Converters"
import { Client, ClientOptions, Message, User, Guild, TextChannel, DMChannel, GroupDMChannel, RichEmbed, Attachment, MessageOptions, Collection } from "discord.js"
import { isUndefined } from "util"
import { join } from "path"

interface CommandContainer {
	getCommand(name: string): Command
	hasCommand(name: string): boolean
	addCommand?(command: Command): void
}

interface CheckContainer {
	checks?: Check[]
	check(context: Context): Promise<boolean>
}

/*

Bot is an extended class of the discord.js Client class
It's main purpose is to be a wrapper for the entire package

*/
export type PrefixCallback = (bot:Bot, msg:Message) => string

export type CommandErrorCallback = (ctx: Context, err: Error) => void | Promise<void>

export class Bot extends Client implements CommandContainer, CheckContainer {
    private Prefix: string | PrefixCallback
    private Sections: Collection<string, Section> = new Collection()
    private Commands: Collection<string, Command> = new Collection()

    private Checks: Check[] = []
    
    private CommandErrorCallbacks: CommandErrorCallback[] = []

    public get checks() {return Object.assign([], this.Checks)}
    public get commands() {return this.Commands}
    public get sections() {return this.Sections}

    /**Calls all the onCommandErrorCallbacks in parallel */
    private fireCommandErrorCallbacks(ctx, error) {
        if (this.CommandErrorCallbacks.length == 0) {
            console.error(error)
        }
        for (let callback of this.CommandErrorCallbacks) {
            this.setTimeout(callback, 0, ctx, error)
        }
    }

    constructor(prefix: string | PrefixCallback, options?: ClientOptions) {
        super(options)

        this.Prefix = prefix
        
        super.on("message", async (message) => {
            let context = new Context(this, message)
            if (!context.valid) {return}
            await context.prepare().catch((err) => {
                this.fireCommandErrorCallbacks(context, err)
            })
            if (!context.prepared) {return}
            context.command.invoke(context).catch((err) => {
                this.fireCommandErrorCallbacks(context, err)
            })
        })
    }

    /**Retrieves the prefix of the bot in relation to the message passed*/
    public getPrefix(message: Message) {
        if (typeof(this.Prefix) === "function") {
            return this.Prefix(this, message)
        }
        return this.Prefix
    }
    
    /**Adds a command to be listened for when a message is sent */
    public createCommand(properties: CommandProperties, callback: CommandCallback) {
        if (this.hasCommand(properties.name)) {
            throw new Errors.CommandExists(`command with name: ${properties.name} already exists`)
        }
        let command = new Command(this, properties, callback)
        this.Commands.set(properties.name, command)
        if (!isUndefined(command.section)) {
            command.section.addCommand(command)
        }
    }
    /**Returns a command based on its name */
    public getCommand(commandName: string) {
        return this.Commands.get(commandName)
    }
    /**Returns if a command exists based on its name */
    public hasCommand(commandName: string) {
        return !isUndefined(this.getCommand(commandName))
    }

    /**Loads a section for the bot to listen for its commands */
    public loadSection(dir: string, modulePath: string) {
        try {
            require(join(dir, modulePath)).setup(this)
        } catch (error) {
            if (error instanceof Errors.SectionExists) {
                throw error
            } else {
                throw new Errors.SectionImplementationError(error.message)
            }
        }
    }
    /**Called when setting up a section
     * 
     * This specifically finds all methods in the Section that
     * are considered a command method
     */
    public addSection(section: Section) {
        if (this.hasSection(section.name)) {
            throw new Errors.SectionExists(`section with name: ${section.name} already exists`)
        }
        
        this.Sections.set(section.name, section)
        
        const loadCommand = (properties, method) => {
            properties.section = section
            try { // Catches any errors when creating to prevent an error breaking the entire section
                this.createCommand(properties, method)
            } catch (e) {console.error(e)}
        }
        const loadEvent = (properties, method) => {
            try { // Catches any errors when creating to prevent an error breaking the entire section
                this.on(properties.name, method)
            } catch (e) {console.error(e)}
        }

        let propertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf(section))
        for (let methodName of propertyNames) {
            let method = section[methodName]
            let commandProperties = method.commandProperties
            let eventProperties = method.eventProperties
            
            if (commandProperties) {loadCommand(commandProperties, method)}
            if (eventProperties) {loadEvent(eventProperties, method)}
        }
    }
    /**Returns a section based on its name */
    public getSection(sectionName: string) {
        return this.Sections.get(sectionName)
    }
    /**Returns if a section exists based on its name */
    public hasSection(sectionName: string) {
        return !isUndefined(this.getSection(sectionName))
    }

    /**Adds a check that will be checked on every command */
    public addCheck(check: Check) {
        this.Checks.push(check)
    }
    /**Checks if the command can proceed with the context */
    public async check(context: Context) {
        for (let check of this.Checks) {
            if (!await check.check(context)) {return false}
        }
        return true
    }

    /**Adds a callback to be called when a command errors
     * 
     * All errors either derive from CommandError or are caused by
     * the command callback
     * 
     * The arguments in context may be incomplete depending on the situation
     */
    public onCommandError(callback: CommandErrorCallback) {
        this.CommandErrorCallbacks.push(callback)
    }

    public run(token: string) {
        this.login(token)
    }
}

/*

Section is an extended version of the main file. It allows
for other files to easily be added into the main bot and for
greater organization

*/
export type SectionProperties = {
    name: string,
    description?: string
    checks?: Check[]
}

export class Section implements CommandContainer, CheckContainer {
    private Properties: SectionProperties
    private Commands: Collection<string, Command> = new Collection()
    
    /**A decorator that defines the method as a command 
     * 
     * If no properties are provided then the required name property
     * will be interpreted as the method name
     */
    public static command(properties?: CommandProperties) {
        return function (target, propertyKey: string, descriptor: PropertyDescriptor) {
            target[propertyKey].commandProperties = properties || {name: propertyKey}
            return target
        }
    }

    public static event(eventName?: string) {
        return function (target, propertyKey: string) {
            target[propertyKey].eventProperties = {
                name: eventName || propertyKey
            }
            return target
        }
    }

    constructor(properties: SectionProperties) {
        this.Properties = properties
    }

    public get name() {return this.Properties.name}
    public get description() {return this.Properties.description}
    public get checks() {return Object.assign([], this.Properties.checks)}
    public get commands() {return this.Commands}

    public addCommand(command: Command) {
        this.Commands.set(command.name, command)
    }
    public getCommand(name: string) {
        return this.Commands.get(name)
    }
    public hasCommand(name: string) {
        return !isUndefined(this.getCommand(name))
    }

    public async check(context: Context) {
        for (let check of this.checks) {
            if (!await check.check(context)) {return false}
        }
        return true
    }
}

/*

Context represents an extension to message. It contains helpful
functions to be used when interpreting a command
The Context also plays the important part of determining what 
command was actually invoked. It also spits the message into arguments

*/
export type SendOptions = {
    message?: string,
    embed?: RichEmbed,
    file?: Attachment
}

export class Context {
    public readonly author: User
    public readonly message: Message
    public readonly guild: Guild
    public readonly channel: TextChannel | DMChannel | GroupDMChannel
    public readonly bot: Bot
    
    public readonly prefix: string
    public readonly command: Command
    
    private Segments: string[] // Unconverted segments of the command arguments
    private Arguments: Record<any, any> // Used to be references straight from context
    private Parameters: any[] // Used to insert into the command callback
    
    private Prepared: boolean = false
    public readonly valid: boolean = false

    private async basicConversion(value, converter, name) {
        if (isUndefined(value) && !converter.optional) {
            throw new Errors.MisssingRequiredArgument(`required argument: ${name} missing`)
        } else if (isUndefined(value) && !isUndefined(converter.default)) {
            return converter.default
        }

        let conversion = await converter.convert(this, value).catch((error) => {
            throw new Errors.CommandImplementationError(`${name} failed to parse due to a converter error`)
        })
        
        if (conversion == undefined && !converter.optional) {
            throw new Errors.BadArgument(`bad argument type for ${name}`)
        }
        return conversion
    }

    /**Prepares the context to be used for a command */
    public async prepare() {
        if (this.Prepared) {return}

        this.Arguments = {}
        this.Parameters = []
        let index = 0
        for (let [name, converter] of Object.entries(this.command.arguments)) {
            let conversion
            if (converter instanceof SpoiledConverter) {
                conversion = []
                let cont = true
                while (cont) {
                    let value = await this.basicConversion(this.Segments[index++], converter, name).catch((err) => {
                        cont = false
                    })
                    if (!isUndefined(value)) {conversion.push(value)}
                }
                if (conversion.length == 0 && !isUndefined(converter.default)) {
                    conversion = converter.defaultS
                }
            } else if (converter instanceof OneofConverter) {
                conversion = await this.basicConversion(this.Segments[index++], converter, name)
                if (conversion === undefined) {
                    throw new Errors.BadArgument(`expected one of ${converter.choices}`)
                }
            } else {
                conversion = await this.basicConversion(this.Segments[index++], converter, name)
            }

            this.Arguments[name] = conversion
            this.Parameters.push(conversion)
        }
        this.Prepared = true
    }

    constructor(bot: Bot, message: Message) {
        if (message.system) {return /*will never be command*/}
        
        let content = message.content
        let prefix = bot.getPrefix(message)
        if (!content.startsWith(prefix)) {
            return // message is not a command error
        }

        content = content.replace(prefix, '')
        let segments = content.split(' ')
        let command = bot.getCommand(segments[0])
        if (command == undefined) {
            return // message is not an existing command
        }

        this.author = message.author
        this.message = message
        this.guild = message.guild
        this.channel = message.channel
        this.bot = bot

        this.prefix = prefix
        this.command = command
        this.Segments = segments.splice(1, segments.length-1)

        this.valid = true
    }
    
    public get arguments() {return this.Arguments}
    public get parameters() {return this.Parameters}
    public get prepared() {return this.Prepared}
    public get hasGuild() {return this.guild instanceof Guild}

    public async send(content?, options?: MessageOptions | RichEmbed | Attachment) {
        await this.channel.send(content, options)
    }
}

/*

Checks are classes that are ran before a command is invoked that
checks if the command show be invoked. If any check returns a false,
undefined or null value then the command will not be invoked

*/
export type CheckCallback = (ctx:Context) => Promise<boolean> | boolean

export class Check {
    private callback: CheckCallback

    constructor(callback: CheckCallback) {
        this.callback = callback
    }

    public async check(context: Context) {
        let result = await this.callback(context)
        return result
    }
}

/*

Command represents a command of the bot
All commands are stored in the bot class and are ran in the command class

*/
export type CommandProperties = {
    name: string,
    arguments?: Record<string, Converter>
    description?: string,
    format?: string,
    hidden?: boolean,
    section?: Section
    checks?: Check[]
}

export type CommandCallback = (ctx:Context, ...args) => Promise<void> | void

export class Command {
    private properties: CommandProperties
    private callback: CommandCallback

    public get name() {return this.properties.name}
    public get arguments() {return Object.assign({}, this.properties.arguments)}
    public get description() {return this.properties.description}
    public get format() {return this.properties.format}
    public get hidden() {return this.properties.hidden}
    public get section() {return this.properties.section}
    public get checks() {return Object.assign([], this.properties.checks)}

    constructor(bot: Bot, properties: CommandProperties, callback: CommandCallback) {
        if (properties.name.indexOf(" ") !== -1) {
            throw new Errors.InvalidCommandName("a command name can not contain a space")
        }
        // Setting defaults
        if (!properties.format && properties.arguments) {
            let formatList = []
            formatList.push(properties.name)
            for (let [key, value] of Object.entries(properties.arguments)) {
                // [] = optional // {} = multiple allowed // [{}] = optional multi-argument
                // [key = default]
                let [firstOpt, lastOpt] = (value.optional) ? ['[', ']'] : ['', '']
                let [firstMulti, lastMulti] = (value instanceof SpoiledConverter) ? ['{', '}'] : ['', '']
                let defaultVal = (value.default) ? ` = ${value.default}` : ""
                let push = `${firstOpt}${firstMulti}${key}${defaultVal}${lastMulti}${lastOpt}`

                formatList.push(push)
            }
            properties.format = formatList.join(" ")
        }
        properties.description = properties.description || "No description"
        properties.hidden = (!isUndefined(properties.hidden)) ? false : properties.hidden
        properties.checks = properties.checks || []
        
        this.properties = properties
        this.callback = callback
    }

    /**Tests the context if the command can be used */
    public async canUse(context: Context) {
        let list = [context.bot, this.section, this]
        for (let obj of list) {
            if (isUndefined(obj)) {continue} // When there is no section
            for (let check of obj.checks) {
                let result = await check.check(context).catch(() => {})
                if (isUndefined(result)) {
                    throw new Errors.CheckImplementationError(`check failed to process correctly in ${this.name}`)
                } else if (!result) {
                    return false
                }
            }
        }
        return true
    }

    public async invoke(context: Context)  {
        if (this !== context.command) {
            throw Error("invalid context given")
        }
        
        let canUse = await this.canUse(context)
        if (!canUse) {
            throw new Errors.CheckError(`check failure`)
        }
        
        await this.callback(context, ...context.parameters)
    }
}