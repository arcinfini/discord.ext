import { Context } from ".";
import { User, GuildChannel, GuildMember, Role } from "discord.js";
export declare type ConverterOptions = {
    default?: any;
    optional?: boolean;
};
export declare abstract class Converter {
    readonly optional: boolean;
    readonly default: any;
    constructor(options?: ConverterOptions);
    abstract convert(context: Context, argument: any): any;
}
/**Converts an argument to a number */
export declare class NumberConverter extends Converter {
    convert(context: Context, argument: any): Promise<number>;
}
/**Converts an argument to a string */
export declare class StringConverter extends Converter {
    convert(context: Context, argument: any): Promise<any>;
}
export declare class UserConverter extends Converter {
    convert(context: Context, argument: string): Promise<User>;
}
export declare class MemberConverter extends Converter {
    convert(context: Context, argument: any): Promise<GuildMember>;
}
export declare class GuildConverter extends Converter {
    convert(context: Context, argument: string): Promise<import("discord.js").Guild>;
}
export declare class RoleConverter extends Converter {
    convert(context: Context, argument: string): Promise<Role>;
}
export declare class GuildChannelConverter<T extends GuildChannel = GuildChannel> extends Converter {
    convert(context: Context, argument: string): Promise<T>;
}
export declare class MessageConverter extends Converter {
    private getMessageInChannel;
    convert(context: Context, argument: string): Promise<import("discord.js").Message>;
}
/**
 * A special type of converter that attempts to convert as many values as possible
 *
 * This converter will not stop converting arguments until it meets an error.
 * Be careful when using this as it may convert more than expected
 *
 * This converter only supports the default option since it is always
 * considered optional
 */
export declare class SpoiledConverter<T extends Converter> extends Converter {
    readonly defaultS: any;
    private readonly converter;
    constructor(converter: (new () => T), options?: {
        default?: any[];
    });
    convert(context: Context, argument: any): Promise<any>;
}
/**
 * A special type of converter that will only convert arguments if their value
 * is in the choices list
 *
 * Otherwise the converter throws the BadArgument Error
 *
 * This feature needs to be resolved because any error thrown inside a converter is
 * considered a ConverterImplementationError and breaks the entire command invokeation
 *
 * Will not be exported until a decision is decided
 */
export declare class OneofConverter<T extends Converter> extends Converter {
    readonly converter: Converter;
    readonly choices: any[];
    constructor(converter: new () => T, choices: []);
    convert(context: Context, argument: any): Promise<any>;
}
