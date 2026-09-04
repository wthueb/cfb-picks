import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { configureLogging, getLogger, withLogContext } from "../dist/index.js";

const fixedDate = new Date(2026, 7, 23, 14, 5, 9);

function capture(format, callback) {
  const lines = [];
  configureLogging({
    format,
    level: "debug",
    timestamp: () => fixedDate,
    write: (line) => lines.push(line),
  });
  callback();
  return lines;
}

test("logfmt output follows the shared field order and quoting style", () => {
  const lines = capture("logfmt", () => {
    withLogContext({ request_id: "request one" }, () => {
      getLogger("cfb_picks.sample").info("pick created", { pick_id: 42, double: false });
    });
  });

  assert.equal(lines.length, 1);
  assert.match(
    lines[0],
    /^ts="2026-08-23 14:05:09" level=INFO logger=cfb_picks\.sample src=.*:\d+ msg="pick created" pick_id=42 double=false request_id="request one"\n$/,
  );
});

test("json output contains the same structured fields", () => {
  const lines = capture("json", () => {
    getLogger("cfb_picks.sample").warning("request failed", {
      status_code: 503,
      error: new Error("unavailable"),
    });
  });

  const record = JSON.parse(lines[0]);
  assert.deepEqual(
    {
      ts: record.ts,
      level: record.level,
      logger: record.logger,
      msg: record.msg,
      status_code: record.status_code,
    },
    {
      ts: "2026-08-23 14:05:09",
      level: "WARNING",
      logger: "cfb_picks.sample",
      msg: "request failed",
      status_code: 503,
    },
  );
  assert.match(record.src, /:\d+$/);
  assert.match(record.exc_info, /Error: unavailable/);
});

test("application log messages are static", async () => {
  const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const dynamicMessages = [];

  for (const root of [resolve(repository, "apps"), resolve(repository, "packages")]) {
    for (const path of await sourceFiles(root)) {
      if (path === resolve(repository, "packages/logging/src/index.ts")) continue;

      const source = await readFile(path, "utf8");
      const calls = source.matchAll(/\.(?:critical|debug|error|info|warning)\(\s*/g);

      for (const call of calls) {
        const messageOffset = (call.index ?? 0) + call[0].length;
        if (hasStaticStringArgument(source, messageOffset)) continue;

        const line = source.slice(0, call.index).split("\n").length;
        dynamicMessages.push(`${path}:${line}`);
      }

      for (const call of source.matchAll(/\bconsole\.(?:debug|error|info|log|warn)\(/g)) {
        const line = source.slice(0, call.index).split("\n").length;
        dynamicMessages.push(`${path}:${line}`);
      }
    }
  }

  assert.deepEqual(dynamicMessages, []);
});

function hasStaticStringArgument(source, offset) {
  const quote = source[offset];
  if (quote !== '"' && quote !== "'" && quote !== "`") return false;

  for (let index = offset + 1; index < source.length; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (quote === "`" && source[index] === "$" && source[index + 1] === "{") return false;
    if (source[index] !== quote) continue;

    const nextToken = source.slice(index + 1).trimStart()[0];
    return nextToken === "," || nextToken === ")";
  }

  return false;
}

async function sourceFiles(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await sourceFiles(path)));
    else if ([".ts", ".tsx"].includes(extname(entry.name))) paths.push(path);
  }
  return paths;
}
