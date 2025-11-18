/**
 * Simple logger utility
 * Can be replaced with pino or other logging library in the future
 */

type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = Record<string, unknown>;

function log(level: LogLevel, context: LogContext, message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  // Format error objects properly
  if (context.err instanceof Error) {
    logEntry.error = {
      message: context.err.message,
      stack: context.err.stack,
      name: context.err.name,
    };
    delete logEntry.err;
  }

  const output = JSON.stringify(logEntry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      console.debug(output);
      break;
    case "info":
    default:
      console.log(output);
      break;
  }
}

export const logger = {
  info: (context: LogContext, message: string) => log("info", context, message),
  warn: (context: LogContext, message: string) => log("warn", context, message),
  error: (context: LogContext, message: string) => log("error", context, message),
  debug: (context: LogContext, message: string) => log("debug", context, message),
};
