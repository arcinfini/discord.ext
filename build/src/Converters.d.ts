import { Context } from "./Ext";
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
    convert(context: Context, argument: any): number;
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
 * This converter does not support the optional option as it will always insert a list
 */
export declare class SpoiledConverter extends Converter {
    readonly defaultS: any;
    private readonly converter;
    constructor(converter: Converter, options?: {
        default?: any[];
    });
    convert(context: Context, argument: any): Promise<any>;
}
