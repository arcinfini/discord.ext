import { Context } from "."
import { User, GuildChannel, GuildMember, TextChannel, Role} from "discord.js"
import { isUndefined, isNumber } from "util"
import { SSL_OP_NO_QUERY_MTU } from "constants"

/*

Converters are used to convert arguments into useable values

*/
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
    public async convert(context: Context, argument) {
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
 * This converter only supports the default option since it is always
 * considered optional
 */
export class SpoiledConverter<T extends Converter> extends Converter {
    public readonly defaultS
    private readonly converter: Converter
    constructor(converter: (new () => T), options: {default?: any[]} = {}) {
        super({optional: false})
        this.converter = new converter()
        this.defaultS = options.default
    }

    public async convert(context: Context, argument) {
        return await this.converter.convert(context, argument)
    }
}

/**
 * A special type of converter that will only convert arguments if their value
 * is in the choices list
 * 
 * Otherwise the converter returns undefined and context picks it up as an error
 */
export class OneofConverter<T extends Converter> extends Converter {
    public readonly converter: Converter
    public readonly choices: any[]
    constructor(converter: new () => T, choices: []) {
        super({optional: false})
        this.converter = new converter()
        this.choices = choices
    }

    public async convert(context: Context, argument) {
        let result = await this.converter.convert(context, argument)
        return (this.choices.includes(result)) ? result : undefined
    }
}