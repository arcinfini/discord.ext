"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Errors;
(function (Errors) {
    class SectionError extends Error {
    }
    Errors.SectionError = SectionError;
    /**Thrown when trying to create a section with an existing name */
    class SectionExists extends SectionError {
    }
    Errors.SectionExists = SectionExists;
    /**Thrown when a section fails to load correctly or is implemented incorrectly */
    class SectionImplementationError extends SectionError {
    }
    Errors.SectionImplementationError = SectionImplementationError;
    class CommandError extends Error {
    }
    Errors.CommandError = CommandError;
    /**Thrown when a command name is invalid (contains spaces) */
    class InvalidCommandName extends CommandError {
    }
    Errors.InvalidCommandName = InvalidCommandName;
    /**Thrown when trying to create a command with an existing name */
    class CommandExists extends CommandError {
    }
    Errors.CommandExists = CommandExists;
    /**Thrown when a check returns a false like value */
    class CheckError extends CommandError {
    }
    Errors.CheckError = CheckError;
    /**Thrown when a check errors */
    class CheckImplementationError extends CommandError {
    }
    Errors.CheckImplementationError = CheckImplementationError;
    /**Thrown when a user-made callback throws an error */
    class CommandImplementationError extends CommandError {
    }
    Errors.CommandImplementationError = CommandImplementationError;
    class ArgumentError extends CommandError {
    }
    Errors.ArgumentError = ArgumentError;
    /**Thrown when context fails to parse an argument  */
    class BadArgument extends ArgumentError {
    }
    Errors.BadArgument = BadArgument;
    /**Thrown when there are less arguments than required */
    class MisssingRequiredArgument extends ArgumentError {
    }
    Errors.MisssingRequiredArgument = MisssingRequiredArgument;
    /**Thrown when there are too many arguments */
    class TooManyArguments extends ArgumentError {
    }
    Errors.TooManyArguments = TooManyArguments;
})(Errors = exports.Errors || (exports.Errors = {}));
