import { Client, ClientOptions, Message, User, Guild, TextChannel, DMChannel, GroupDMChannel, RichEmbed, Attachment, MessageOptions, Collection, GuildMember, GuildChannel, Role } from "discord.js"
import { isUndefined, isString, isNumber, isNull } from "util"
import { join } from "path"

interface CommandContainer {
	getCommand(name: string): Extension.Command
	hasCommand(name: string): boolean
	addCommand?(command: Extension.Command): void
}

interface CheckContainer {
	checks?: Extension.Check[]
	check(context: Extension.Context): Promise<boolean>
}

export namespace Extension {
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
				throw new Errors.MisssingRequiredArgument(`${name} missing from ${this.command.name} arguments`)
			} else if (isUndefined(value) && !isUndefined(converter.default)) {
				return converter.default
			}

			let conversion = await converter.convert(this, value).catch((error) => {
				throw new Errors.BadArgument(`${name} failed to parse`)
			})
			
			if (isUndefined(conversion) || conversion === null) {
				throw new Errors.MisssingRequiredArgument(`${name} missing from ${this.command.name} arguments`)
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
				if (converter instanceof Converters.SpoiledConverter) {
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
		arguments?: Record<string, Converters.Converter>
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
					// [] = optional // {} = multiple allowed
					// [key = default]
					let [first, last] = (value.optional) ? ['[', ']'] : ['{', '}']
					let defaultVal = (value.default) ? ` = ${value.default}` : ""
					let push = `${first}${key}${defaultVal}${last}`

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

	/**
	
	Converters are used to convert arguments into useable values

	*/
	export namespace Converters {

		export type ConverterOptions = {
			default?: any,
			optional?: boolean
		}

		export abstract class Converter {
			public readonly optional: boolean
			public readonly default: any

			constructor(options:ConverterOptions = {}) {
				this.optional = (isUndefined(options.optional)) ? false : options.optional
				this.default = options.default

				if (!isUndefined(this.default)) {
					this.optional = true
				}
			}
			
			abstract convert(context: Context, argument)
		}

		/**Converts an argument to a number */
		export class NumberConverter extends Converter {
			public convert(context: Context, argument) {
				let conversion = Number(argument)
				return (isNaN(conversion)) ? undefined : conversion
			}
		}

		/**Converts an argument to a string */
		export class StringConverter extends Converter {
			public async convert(context: Context, argument) {
				return argument
			} 
		}

		export class UserConverter extends Converter {
			public async convert(context: Context, argument: string) {
				let user: User | void
				// Check if it is a mention
				let idMatch = argument.match("^<@!?([0-9]+)>$")
				if (idMatch) {
					user = await context.bot.fetchUser(idMatch[1]).catch(() => {})
					if (user) {return user}
				}
				// Check if it is a number : ID
				let id = Number(argument)
				if (isNumber(id)) {
					user = await context.bot.fetchUser(id.toString()).catch(() => {})
					if (user) {return user}
				}
				return undefined
			}
		}

		export class MemberConverter extends Converter {
			public async convert(context: Context, argument) {
				let userConverter = new UserConverter({optional: true})
				let user: GuildMember | User = await userConverter.convert(context, argument)
				if (isUndefined(user) && context.hasGuild) {
					user = context.guild.members.find((member) => {
						let u = member.user
						let username = u.username
						if (`${username}#${u.discriminator}` === argument) {return true}
						if (username === argument) {return true}
						if (member.displayName === argument) {return true}
						return false
					})
				}
				return (isUndefined(user)) ? undefined : context.guild.member(user)
			}
		}

		export class GuildConverter extends Converter {
			public async convert(context: Context, argument: string) {
				return context.bot.guilds.get(argument)
			}
		}

		export class RoleConverter extends Converter {
			public async convert(context: Context, argument: string) {
				// Mention
				let roleMention = argument.match("^<@&([0-9]+)>$")
				if (roleMention && context.hasGuild) {
					let role = context.guild.roles.get(roleMention[1])
					if (role) {return role}
				}
				// id
				let idMatch = argument.match("^([0-9]+)$")
				if (idMatch && context.hasGuild) {
					let role = context.guild.roles.get(idMatch[1])
					if (role) {return role}
				}
				// guildid-roleid
				let guildRoleId = argument.match("^([0-9]+)-([0-9]+)$")
				if (guildRoleId) {
					let guildId = guildRoleId[1]
					let guild = context.bot.guilds.get(guildId)
					if (guild) {
						let role = context.guild.roles.get(guildRoleId[2])
						if (role) {return role}
					}
				}
				// name
				if (context.hasGuild) {
					let role = context.guild.roles.find((role: Role) => {
						return role.name == argument
					})
					if (role) {return role}
				}
				return undefined
			}
		}

		export class GuildChannelConverter<T extends GuildChannel = GuildChannel> extends Converter {
			public async convert(context: Context, argument: string) {
				// Mention
				let channelMention = argument.match("^<#([0-9]+)>$")
				if (channelMention && context.hasGuild) {
					let channel = context.guild.channels.get(channelMention[1])
					if (channel) {return channel as T}
				}
				// Id
				let idMatch = argument.match("^([0-9]+)$")
				if (idMatch && context.hasGuild) {
					let channel = context.guild.channels.get(idMatch[1])
					if (channel) {return channel as T}
				}
				// guildid-channelid
				let guildChannelId = argument.match("^([0-9]+)-([0-9]+)$")
				if (guildChannelId) {
					let guildId = guildChannelId[1]
					let guild = context.bot.guilds.get(guildId)
					let channel = guild.channels.get(guildChannelId[2])
					if (channel) {return channel as T}
				}
				// name
				if (context.hasGuild) {
					let channel = context.guild.channels.find((channel: GuildChannel) => {
						return channel.name == argument
					})
					if (channel) {return channel as T}
				}
				return undefined
			}
		}

		export class MessageConverter extends Converter {
			private async getMessageInChannel(guild, channelId, messageId) {
				let channel = guild.channels.get(channelId) as TextChannel
				if (channel) {
					let message = await channel.fetchMessage(messageId).catch(() => {})
					return message
				}
			}
			
			public async convert(context: Context, argument: string) {
				// Message id
				let messageId = argument.match("^([0-9]+)$")
				if (messageId) {
					let message = await context.channel.fetchMessage(messageId[1]).catch(() => {})
					if (message) {return message}
				}
				// {channelid}-{messageid}
				let channelMessageId = argument.match("^([0-9]+)-([0-9]+)$")
				if (channelMessageId && context.hasGuild) {
					let message = await this.getMessageInChannel(context.guild, channelMessageId[1], channelMessageId[2])
					if (message) {return message}
				}
				// Message link
				let messageLink = argument.match("([0-9]+)\/([0-9]+)\/([0-9]+)$")
				if (messageLink) {
					let guildId = messageLink[1]
					let guild = context.bot.guilds.get(guildId)
					if (guild) {
						let message = await this.getMessageInChannel(guild, messageLink[2], messageLink[3]).catch(() => {})
						if (message) {return message}
					}
				}
				return undefined
			}
		}

		/**
		 * A special type of converter that attempts to convert as many values as possible 
		 * 
		 * This converter will not stop converting arguments until it meets an error.
		 * Be careful when using this as it may convert more than expected
		 * 
		 * This converter does not support the optional option as it will always insert a list
		 */
		export class SpoiledConverter extends Converter {
			public readonly defaultS
			private readonly converter: Converter
			constructor(converter: Converter, options: {default?: any[]} = {}) {
				super({optional: false})
				this.converter = converter

				this.defaultS = options.default
			}

			public async convert(context: Context, argument) {
				return await this.converter.convert(context, argument)
			}
		}

	}

	export namespace Errors {

		export class SectionError extends Error {}
		/**Thrown when trying to create a section with an existing name */
		export class SectionExists extends SectionError {}
		/**Thrown when a section fails to load correctly or is implemented incorrectly */
		export class SectionImplementationError extends SectionError {}

		export class CommandError extends Error {}
		/**Thrown when a command name is invalid (contains spaces) */
		export class InvalidCommandName extends CommandError {}
		/**Thrown when trying to create a command with an existing name */
		export class CommandExists extends CommandError {}
		/**Thrown when a check returns a false like value */
		export class CheckError extends CommandError {}
		/**Thrown when a check errors */
		export class CheckImplementationError extends CommandError {}
		/**Thrown when a user-made callback throws an error */
		export class CommandImplementationError extends CommandError {}

		export class ArgumentError extends CommandError {}
		/**Thrown when context fails to parse an argument  */
		export class BadArgument extends ArgumentError {}
		/**Thrown when there are less arguments than required */
		export class MisssingRequiredArgument extends ArgumentError {}
		/**Thrown when there are too many arguments */
		export class TooManyArguments extends ArgumentError {}

	}
}