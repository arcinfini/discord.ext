"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
class Converter {
    constructor(options = {}) {
        this.optional = (util_1.isUndefined(options.optional)) ? false : options.optional;
        this.default = options.default;
        if (!util_1.isUndefined(this.default)) {
            this.optional = true;
        }
    }
}
exports.Converter = Converter;
/**Converts an argument to a number */
class NumberConverter extends Converter {
    convert(context, argument) {
        let conversion = Number(argument);
        return (isNaN(conversion)) ? undefined : conversion;
    }
}
exports.NumberConverter = NumberConverter;
/**Converts an argument to a string */
class StringConverter extends Converter {
    async convert(context, argument) {
        return argument;
    }
}
exports.StringConverter = StringConverter;
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
exports.UserConverter = UserConverter;
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
exports.MemberConverter = MemberConverter;
class GuildConverter extends Converter {
    async convert(context, argument) {
        return context.bot.guilds.get(argument);
    }
}
exports.GuildConverter = GuildConverter;
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
exports.RoleConverter = RoleConverter;
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
exports.GuildChannelConverter = GuildChannelConverter;
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
exports.MessageConverter = MessageConverter;
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
exports.SpoiledConverter = SpoiledConverter;
