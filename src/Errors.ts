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

    export class ConverterError extends Error {}
    /**Thrown when there is an error in a Converter implementation */
    export class ConverterImplementationError extends ConverterError {}

    export class ArgumentError extends CommandError {}
    /**Thrown when context fails to parse an argument  */
    export class BadArgument extends ArgumentError {}
    /**Thrown when there are less arguments than required */
    export class MisssingRequiredArgument extends ArgumentError {}
    /**Thrown when there are too many arguments */
    export class TooManyArguments extends ArgumentError {}

}