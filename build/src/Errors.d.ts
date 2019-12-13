export declare namespace Errors {
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
