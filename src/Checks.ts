import { Context, Errors } from "."
/*

Checks are classes that are ran before a command is invoked that
checks if the command show be invoked. If any check returns a false,
undefined or null value then the command will not be invoked

*/
export type CheckCallback = (ctx:Context) => Promise<boolean> | boolean

export class Check {
    public readonly callback: CheckCallback

    /**
     * Takes a callback as an argument and calls that check before
     * the command is called
     * 
     * The callback is turned into a check that is then inserted into the method.
     * The check is embedded into the function of the command and will be called
     * every time.
     */
    public static use(callback: CheckCallback) {
        return function (target, propertyKey) {
            let method = target[propertyKey]
            if (!(method instanceof Function)) {
                throw new Errors.CheckImplementationError("checks must be put on methods")
            }
            let check = new Check(callback)
            // Registers checks through method.commandProperties if the command decorator
            // has already been called
            if (method.commandProperties) {
                method.commandProperties.checks.push(check)
                return target
            }
            // Registers checks through method.checks to be inserted into commandProperties.checks
            // when the command decorator is called
            let checksList = method.checks
            if (checksList == undefined) {
                checksList = []
                method.checks = checksList
            }
            checksList.push(check)

            return target
        }
    }

    /**
     * Checks true if the command was used in a guild
     */
    public static isGuild() {
        return function (target, propertyKey) {
            return Check.use((ctx: Context) => {
                return ctx.hasGuild
            })(target, propertyKey)
        }
    }

    /**
     * Checks true if the command was used in a DM
     */
    public static isDirectMessage() {
        return function (target, propertyKey) {
            return Check.use((ctx: Context) => {
                return !ctx.hasGuild
            })(target, propertyKey)
        }
    }

    /**Unimplemented */
    private static isOwner() {

    }

    /**
     * Checks true if a user has the id in the list passed
     */
    public static whitelist(ids: string[]) {
        return function (target, propertyKey) {
            return Check.use((ctx: Context) => {
                return ids.includes(ctx.author.id)
            })(target, propertyKey)
        }
    }

    /**
     * Checks true if a user does not have an id in the list passed
     */
    public static blacklist(ids: string[]) {
        return function (target, propertyKey) {
            return Check.use((ctx: Context) => {
                return !ids.includes(ctx.author.id)
            })(target, propertyKey)
        }
    }

    constructor(callback: CheckCallback) {
        this.callback = callback
    }

    public async check(context: Context) {
        let result = await this.callback(context)
        return result
    }
}

// To create your own check decorator

// function myCheck() {
//     return function (target, propertyKey) {
//         return Check.use((ctx: Context) => {
//             return true
//         })(target, propertyKey)
//     }
// }