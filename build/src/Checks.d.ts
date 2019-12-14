import { Context } from ".";
export declare type CheckCallback = (ctx: Context) => Promise<boolean> | boolean;
export declare class Check {
    readonly callback: CheckCallback;
    /**
     * Takes a callback as an argument and calls that check before
     * the command is called
     *
     * The function for the command is taken and morphed into a new function.
     * The check is embedded into the function of the command and will be called
     * every time.
     */
    static use(callback: CheckCallback): (target: any, propertyKey: any) => any;
    /**
     * Checks true if the command was used in a guild
     */
    static isGuild(): (target: any, propertyKey: any) => any;
    /**
     * Checks true if the command was used in a DM
     */
    static isDirectMessage(): (target: any, propertyKey: any) => any;
    /**Unimplemented */
    private static isOwner;
    /**
     * Checks true if a user has the id in the list passed
     */
    static whitelist(ids: string[]): (target: any, propertyKey: any) => any;
    /**
     * Checks true if a user does not have an id in the list passed
     */
    static blacklist(ids: string[]): (target: any, propertyKey: any) => any;
    constructor(callback: CheckCallback);
    check(context: Context): Promise<boolean>;
}
