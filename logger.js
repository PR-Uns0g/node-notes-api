const winston = require("winston");

const { combine, timestamp, printf, colorize, align, json, metadata } =
  winston.format;

const logLineFormat = () =>
  combine(
    timestamp({ format: "YYYY-MM-DD hh:mm:ss.SSS" }),
    align(),
    metadata({ fillExcept: ["level", "message", "timestamp"] }),
    printf((info) => {
      const logMetadata = info.metadata ?? {};
      const details = Object.keys(logMetadata).length
        ? ` ${JSON.stringify(logMetadata)}`
        : "";

      return `[${info.timestamp}] ${info.level}: ${info.message}${details}`;
    }),
  );

const errorFilter = winston.format((info, opts) => {
  return info.level === "error" ? info : false;
});

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: "combined.log",
      format: logLineFormat(),
    }),
    new winston.transports.File({
      filename: "errors.log",
      level: "error",
      format: combine(errorFilter(), timestamp(), json()),
    }),
    new winston.transports.Console({
      format: combine(colorize({ all: true }), logLineFormat()),
    }),
  ],
});

module.exports = { logger };
