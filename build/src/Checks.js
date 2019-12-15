"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
class Check {
    constructor(callback) {
        this.callback = callback;
    }
    /**
     * Takes a callback as an argument and calls that check before
     * the command is called
     *
     * The callback is turned into a check that is then inserted into the method.
     * The check is embedded into the function of the command and will be called
     * every time.
     */
    static use(callback) {
        return function (target, propertyKey) {
            let method = target[propertyKey];
            if (!(method instanceof Function)) {
                throw new _1.Errors.CheckImplementationError("checks must be put on methods");
            }
            let check = new Check(callback);
            // Registers checks through method.commandProperties if the command decorator
            // has already been called
            if (method.commandProperties) {
                method.commandProperties.checks.push(check);
                return target;
            }
            // Registers checks through method.checks to be inserted into commandProperties.checks
            // when the command decorator is called
            let checksList = method.checks;
            if (checksList == undefined) {
                checksList = [];
                method.checks = checksList;
            }
            checksList.push(check);
            return target;
        };
    }
    /**
     * Checks true if the command was used in a guild
     */
    static isGuild() {
        return function (target, propertyKey) {
            return Check.use((ctx) => {
                return ctx.hasGuild;
            })(target, propertyKey);
        };
    }
    /**
     * Checks true if the command was used in a DM
     */
    static isDirectMessage() {
        return function (target, propertyKey) {
            return Check.use((ctx) => {
                return !ctx.hasGuild;
            })(target, propertyKey);
        };
    }
    /**Unimplemented */
    static isOwner() {
    }
    /**
     * Checks true if a user has the id in the list passed
     */
    static whitelist(ids) {
        return function (target, propertyKey) {
            return Check.use((ctx) => {
                return ids.includes(ctx.author.id);
            })(target, propertyKey);
        };
    }
    /**
     * Checks true if a user does not have an id in the list passed
     */
    static blacklist(ids) {
        return function (target, propertyKey) {
            return Check.use((ctx) => {
                return !ids.includes(ctx.author.id);
            })(target, propertyKey);
        };
    }
    async check(context) {
        let result = await this.callback(context);
        return result;
    }
}
exports.Check = Check;
// To create your own check decorator
// function myCheck() {
//     return function (target, propertyKey) {
//         return Check.use((ctx: Context) => {
//             return true
//         })(target, propertyKey)
//     }
// }
