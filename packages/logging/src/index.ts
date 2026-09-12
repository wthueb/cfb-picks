import type { ILogObj, ILogObjMeta, ISettings, LogFormatter } from "tslog";
import { Logger as TsLogger } from "tslog";

export type LogFormat = "json" | "logfmt";
export type LogLevel = "critical" | "debug" | "error" | "info" | "warning";
export type LogFields = Readonly<Record<string, unknown>>;

interface LoggingOptions {
  format?: LogFormat;
  level?: LogLevel;
  timestamp?: () => Date;
  write?: (line: string) => void;
}

interface LoggingState {
  options: Required<Omit<LoggingOptions, "timestamp">> & Pick<LoggingOptions, "timestamp">;
  root?: TsLogger<ILogObj>;
}

const levels: Record<LogLevel, number> = {
  debug: 2,
  info: 3,
  warning: 4,
  error: 5,
  critical: 6,
};
const reservedFields = new Set(["ts", "level", "logger", "src", "msg"]);
const metadataFields = new Set([
  "browser",
  "date",
  "hostname",
  "logLevelId",
  "logLevelName",
  "name",
  "parentNames",
  "path",
  "runtime",
  "runtimeVersion",
  "v",
]);
const stateKey = Symbol.for("@cfb-picks/logging.state");
const globalState = globalThis as unknown as Record<symbol, LoggingState | undefined>;
const state = (globalState[stateKey] ??= {
  options: {
    format: environmentFormat(),
    level: environmentLevel(),
    write: (line) => process.stdout.write(line),
  },
});

const formatter: LogFormatter<ILogObj> = (record, settings) =>
  state.options.format === "json"
    ? JSON.stringify(buildOutputRecord(record, settings), jsonReplacer())
    : renderLogfmt(buildOutputRecord(record, settings));

const rootLogger = (state.root ??= new TsLogger<ILogObj>({
  type: "hidden",
  minLevel: "DEBUG",
  stack: {
    capture: "full",
    internalFramePatterns: [/(?:@cfb-picks[/\\]logging|packages[/\\]logging)[/\\]/],
  },
  strictConfig: true,
  attachedTransports: [
    {
      name: "stdout",
      format: formatter,
      write: (_record, line) => state.options.write(`${line}\n`),
    },
  ],
}));

export function configureLogging(options: LoggingOptions = {}): void {
  state.options = { ...state.options, ...options };
}

export function withLogContext<T>(fields: LogFields, callback: () => T): T {
  return rootLogger.runInContext({ ...fields }, callback);
}

export class Logger {
  readonly #logger: TsLogger<ILogObj>;

  constructor(name: string, fields: LogFields = {}, logger?: TsLogger<ILogObj>) {
    this.#logger = logger ?? rootLogger.getSubLogger({ name, bindings: { ...fields } });
  }

  child(fields: LogFields): Logger {
    return new Logger("", {}, this.#logger.getSubLogger({ bindings: { ...fields } }));
  }

  debug(message: string, fields?: LogFields): void {
    this.#write("debug", message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.#write("info", message, fields);
  }

  warning(message: string, fields?: LogFields): void {
    this.#write("warning", message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.#write("error", message, fields);
  }

  critical(message: string, fields?: LogFields): void {
    this.#write("critical", message, fields);
  }

  #write(level: LogLevel, message: string, fields: LogFields = {}): void {
    if (levels[level] < levels[state.options.level]) return;

    const normalizedFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || reservedFields.has(key)) continue;
      normalizedFields[key === "error" ? "exc_info" : key] =
        key === "error" ? formatException(value) : value;
    }

    const record = { msg: message, ...normalizedFields };
    switch (level) {
      case "debug":
        this.#logger.debug(record);
        break;
      case "info":
        this.#logger.info(record);
        break;
      case "warning":
        this.#logger.warn(record);
        break;
      case "error":
        this.#logger.error(record);
        break;
      case "critical":
        this.#logger.fatal(record);
        break;
    }
  }
}

export function getLogger(name: string): Logger {
  return new Logger(name);
}

function environmentFormat(): LogFormat {
  const value = process.env.LOG_FORMAT;
  if (value === undefined || value === "logfmt") return "logfmt";
  if (value === "json") return "json";
  throw new Error("LOG_FORMAT must be either logfmt or json");
}

function environmentLevel(): LogLevel {
  const value = process.env.LOG_LEVEL;
  if (value === undefined) return "debug";
  if (
    value === "debug" ||
    value === "info" ||
    value === "warning" ||
    value === "error" ||
    value === "critical"
  ) {
    return value;
  }
  throw new Error("LOG_LEVEL must be debug, info, warning, error, or critical");
}

function buildOutputRecord(
  record: ILogObj & ILogObjMeta,
  settings: ISettings<ILogObj>,
): Record<string, unknown> {
  const metadata = record[settings.meta.property] as unknown as Record<string, unknown>;
  const path = metadata.path as
    { fileLine?: string; fileName?: string; method?: string } | undefined;
  const timestamp = state.options.timestamp?.() ?? (metadata.date as Date);
  const output: Record<string, unknown> = {
    ts: formatTimestamp(timestamp),
    level: normalizeLevel(String(metadata.logLevelName)),
    logger: loggerName(metadata),
    src: `${path?.method ?? path?.fileName ?? "unknown"}:${path?.fileLine ?? "0"}`,
    msg: record.msg,
  };

  for (const [key, value] of Object.entries(record as unknown as Record<string, unknown>)) {
    if (key === settings.meta.property || reservedFields.has(key) || value === undefined) continue;
    output[key] = value;
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (metadataFields.has(key) || reservedFields.has(key) || value === undefined) continue;
    output[key] = value;
  }

  return output;
}

function loggerName(metadata: Record<string, unknown>): string {
  const names: string[] = [];
  if (Array.isArray(metadata.parentNames)) {
    for (const name of metadata.parentNames as unknown[]) {
      if (typeof name === "string" && name.length > 0) names.push(name);
    }
  }
  if (typeof metadata.name === "string" && metadata.name.length > 0) names.push(metadata.name);
  return names.join(".") || "cfb_picks";
}

function normalizeLevel(level: string): string {
  if (level === "WARN") return "WARNING";
  if (level === "FATAL") return "CRITICAL";
  return level;
}

function formatTimestamp(date: Date): string {
  const parts = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((part) => String(part).padStart(2, "0"));

  return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}:${parts[5]}`;
}

function formatException(value: unknown): unknown {
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  return value;
}

function renderLogfmt(record: Record<string, unknown>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${encodeLogfmtValue(value)}`)
    .join(" ");
}

function encodeLogfmtValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);

  if (typeof value === "undefined") return "undefined";
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (typeof value === "symbol") return value.description ?? "Symbol";

  const stringValue = typeof value === "string" ? value : JSON.stringify(value, jsonReplacer());
  return /^[^\s="\\]+$/.test(stringValue) ? stringValue : JSON.stringify(stringValue);
}

function jsonReplacer() {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown): unknown => {
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  };
}
