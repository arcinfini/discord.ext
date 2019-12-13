import { Converter } from "./Converters";
import { Client, ClientOptions, Message, User, Guild, TextChannel, DMChannel, GroupDMChannel, RichEmbed, Attachment, MessageOptions, Collection } from "discord.js";
interface CommandContainer {
    getCommand(name: string): Command;
    hasCommand(name: string): boolean;
    addCommand?(command: Command): void;
}
interface CheckContainer {
    checks?: Check[];
    check(context: Context): Promise<boolean>;
}
export declare type PrefixCallback = (bot: Bot, msg: Message) => string;
export declare type CommandErrorCallback = (ctx: Context, err: Error) => void | Promise<void>;
export declare class Bot extends Client implements CommandContainer, CheckContainer {
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
export declare type SectionProperties = {
    name: string;
    description?: string;
    checks?: Check[];
};
export declare class Section implements CommandContainer, CheckContainer {
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
export declare type SendOptions = {
    message?: string;
    embed?: RichEmbed;
    file?: Attachment;
};
export declare class Context {
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
export declare type CheckCallback = (ctx: Context) => Promise<boolean> | boolean;
export declare class Check {
    private callback;
    constructor(callback: CheckCallback);
    check(context: Context): Promise<boolean>;
}
export declare type CommandProperties = {
    name: string;
    arguments?: Record<string, Converter>;
    description?: string;
    format?: string;
    hidden?: boolean;
    section?: Section;
    checks?: Check[];
};
export declare type CommandCallback = (ctx: Context, ...args: any[]) => Promise<void> | void;
export declare class Command {
    private properties;
    private callback;
    get name(): string;
    get arguments(): Record<string, Converter>;
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
export {};
