import { Client, ClientOptions, Message, User, Guild, TextChannel, DMChannel, GroupDMChannel, RichEmbed, Attachment, MessageOptions, Collection, GuildMember, GuildChannel, Role } from "discord.js";
interface CommandContainer {
    getCommand(name: string): Extension.Command;
    hasCommand(name: string): boolean;
    addCommand?(command: Extension.Command): void;
}
interface CheckContainer {
    checks?: Extension.Check[];
    check(context: Extension.Context): Promise<boolean>;
}
export declare namespace Extension {
    type PrefixCallback = (bot: Bot, msg: Message) => string;
    type CommandErrorCallback = (ctx: Context, err: Error) => void | Promise<void>;
    class Bot extends Client implements CommandContainer, CheckContainer {
        private Prefix;
        private Sections;
        private Commands;
        private Checks;
        private CommandErrorCallbacks;
        get checks(): any[] & Check[];
        get commands(): Collection<string, Command>;
        get sections(): Collection<string, Section>;
        /**Calls all the onCommandErrorCallbacks in parallel */
        private fireCommandErrorCallbacks;
        constructor(prefix: string | PrefixCallback, options?: ClientOptions);
        /**Retrieves the prefix of the bot in relation to the message passed*/
        getPrefix(message: Message): string;
        /**Adds a command to be listened for when a message is sent */
        createCommand(properties: CommandProperties, callback: CommandCallback): void;
        /**Returns a command based on its name */
        getCommand(commandName: string): Command;
        /**Returns if a command exists based on its name */
        hasCommand(commandName: string): boolean;
        /**Loads a section for the bot to listen for its commands */
        loadSection(dir: string, modulePath: string): void;
        /**Called when setting up a section
         *
         * This specifically finds all methods in the Section that
         * are considered a command method
         */
        addSection(section: Section): void;
        /**Returns a section based on its name */
        getSection(sectionName: string): Section;
        /**Returns if a section exists based on its name */
        hasSection(sectionName: string): boolean;
        /**Adds a check that will be checked on every command */
        addCheck(check: Check): void;
        /**Checks if the command can proceed with the context */
        check(context: Context): Promise<boolean>;
        /**Adds a callback to be called when a command errors
         *
         * All errors either derive from CommandError or are caused by
         * the command callback
         *
         * The arguments in context may be incomplete depending on the situation
         */
        onCommandError(callback: CommandErrorCallback): void;
        run(token: string): void;
    }
    type SectionProperties = {
        name: string;
        description?: string;
        checks?: Check[];
    };
    class Section implements CommandContainer, CheckContainer {
        private Properties;
        private Commands;
        /**A decorator that defines the method as a command
         *
         * If no properties are provided then the required name property
         * will be interpreted as the method name
         */
        static command(properties?: CommandProperties): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => any;
        static event(eventName?: string): (target: any, propertyKey: string) => any;
        constructor(properties: SectionProperties);
        get name(): string;
        get description(): string;
        get checks(): any[] & Check[];
        get commands(): Collection<string, Command>;
        addCommand(command: Command): void;
        getCommand(name: string): Command;
        hasCommand(name: string): boolean;
        check(context: Context): Promise<boolean>;
    }
    type SendOptions = {
        message?: string;
        embed?: RichEmbed;
        file?: Attachment;
    };
    class Context {
        readonly author: User;
        readonly message: Message;
        readonly guild: Guild;
        readonly channel: TextChannel | DMChannel | GroupDMChannel;
        readonly bot: Bot;
        readonly prefix: string;
        readonly command: Command;
        private Segments;
        private Arguments;
        private Parameters;
        private Prepared;
        readonly valid: boolean;
        private basicConversion;
        /**Prepares the context to be used for a command */
        prepare(): Promise<void>;
        constructor(bot: Bot, message: Message);
        get arguments(): Record<any, any>;
        get parameters(): any[];
        get prepared(): boolean;
        get hasGuild(): boolean;
        send(content?: any, options?: MessageOptions | RichEmbed | Attachment): Promise<void>;
    }
    type CheckCallback = (ctx: Context) => Promise<boolean> | boolean;
    class Check {
        private callback;
        constructor(callback: CheckCallback);
        check(context: Context): Promise<boolean>;
    }
    type CommandProperties = {
        name: string;
        arguments?: Record<string, Converters.Converter>;
        description?: string;
        format?: string;
        hidden?: boolean;
        section?: Section;
        checks?: Check[];
    };
    type CommandCallback = (ctx: Context, ...args: any[]) => Promise<void> | void;
    class Command {
        private properties;
        private callback;
        get name(): string;
        get arguments(): Record<string, Converters.Converter>;
        get description(): string;
        get format(): string;
        get hidden(): boolean;
        get section(): Section;
        get checks(): any[] & Check[];
        constructor(bot: Bot, properties: CommandProperties, callback: CommandCallback);
        /**Tests the context if the command can be used */
        canUse(context: Context): Promise<boolean>;
        invoke(context: Context): Promise<void>;
    }
    /**
    
    Converters are used to convert arguments into useable values

    */
    namespace Converters {
        type ConverterOptions = {
            default?: any;
            optional?: boolean;
        };
        abstract class Converter {
            readonly optional: boolean;
            readonly default: any;
            constructor(options?: ConverterOptions);
            abstract convert(context: Context, argument: any): any;
        }
        /**Converts an argument to a number */
        class NumberConverter extends Converter {
            convert(context: Context, argument: any): number;
        }
        /**Converts an argument to a string */
        class StringConverter extends Converter {
            convert(context: Context, argument: any): Promise<any>;
        }
        class UserConverter extends Converter {
            convert(context: Context, argument: string): Promise<User>;
        }
        class MemberConverter extends Converter {
            convert(context: Context, argument: any): Promise<GuildMember>;
        }
        class GuildConverter extends Converter {
            convert(context: Context, argument: string): Promise<Guild>;
        }
        class RoleConverter extends Converter {
            convert(context: Context, argument: string): Promise<Role>;
        }
        class GuildChannelConverter<T extends GuildChannel = GuildChannel> extends Converter {
            convert(context: Context, argument: string): Promise<T>;
        }
        class MessageConverter extends Converter {
            private getMessageInChannel;
            convert(context: Context, argument: string): Promise<Message>;
        }
        /**
         * A special type of converter that attempts to convert as many values as possible
         *
         * This converter will not stop converting arguments until it meets an error.
         * Be careful when using this as it may convert more than expected
         *
         * This converter does not support the optional option as it will always insert a list
         */
        class SpoiledConverter extends Converter {
            readonly defaultS: any;
            private readonly converter;
            constructor(converter: Converter, options?: {
                default?: any[];
            });
            convert(context: Context, argument: any): Promise<any>;
        }
    }
    namespace Errors {
        class SectionError extends Error {
        }
        /**Thrown when trying to create a section with an existing name */
        class SectionExists extends SectionError {
        }
        /**Thrown when a section fails to load correctly or is implemented incorrectly */
        class SectionImplementationError extends SectionError {
        }
        class CommandError extends Error {
        }
        /**Thrown when a command name is invalid (contains spaces) */
        class InvalidCommandName extends CommandError {
        }
        /**Thrown when trying to create a command with an existing name */
        class CommandExists extends CommandError {
        }
        /**Thrown when a check returns a false like value */
        class CheckError extends CommandError {
        }
        /**Thrown when a check errors */
        class CheckImplementationError extends CommandError {
        }
        /**Thrown when a user-made callback throws an error */
        class CommandImplementationError extends CommandError {
        }
        class ArgumentError extends CommandError {
        }
        /**Thrown when context fails to parse an argument  */
        class BadArgument extends ArgumentError {
        }
        /**Thrown when there are less arguments than required */
        class MisssingRequiredArgument extends ArgumentError {
        }
        /**Thrown when there are too many arguments */
        class TooManyArguments extends ArgumentError {
        }
    }
}
export {};
