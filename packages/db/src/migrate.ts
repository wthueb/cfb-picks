import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import type { Transaction } from "@libsql/client";

import { client } from "./client.js";

interface Journal {
  entries: {
    tag: string;
    when: number;
  }[];
}

interface Migration {
  hash: string;
  statements: string[];
  timestamp: number;
}

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const lockRetryCount = 120;
const lockRetryDelay = 500;

function readMigrations(): Migration[] {
  const journalPath = `${migrationsFolder}/meta/_journal.json`;

  if (!existsSync(journalPath)) {
    throw new Error(`Migration journal not found at ${journalPath}`);
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;

  return journal.entries.map((entry) => {
    const migrationPath = `${migrationsFolder}/${entry.tag}.sql`;

    if (!existsSync(migrationPath)) {
      throw new Error(`Migration file not found at ${migrationPath}`);
    }

    const sql = readFileSync(migrationPath, "utf8");

    return {
      hash: createHash("sha256").update(sql).digest("hex"),
      statements: sql.split("--> statement-breakpoint"),
      timestamp: entry.when,
    };
  });
}

function isDatabaseBusy(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "SQLITE_BUSY"
  );
}

async function acquireMigrationLock(): Promise<Transaction> {
  for (let attempt = 1; attempt <= lockRetryCount; attempt++) {
    try {
      return await client.transaction("write");
    } catch (error) {
      if (!isDatabaseBusy(error) || attempt === lockRetryCount) {
        throw error;
      }

      await setTimeout(lockRetryDelay);
    }
  }

  throw new Error("Failed to acquire the database migration lock");
}

export async function migrate(): Promise<void> {
  const migrations = readMigrations();
  let transaction: Transaction | undefined;

  try {
    await client.execute("PRAGMA foreign_keys = OFF");
    transaction = await acquireMigrationLock();

    await transaction.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      )
    `);

    const appliedMigrations = await transaction.execute(
      "SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
    );
    const latestTimestamp = Number(appliedMigrations.rows[0]?.created_at ?? 0);
    const pendingMigrations = migrations.filter(
      (migration) => migration.timestamp > latestTimestamp,
    );

    for (const migration of pendingMigrations) {
      for (const statement of migration.statements) {
        await transaction.execute(statement);
      }

      await transaction.execute({
        sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        args: [migration.hash, migration.timestamp],
      });
    }

    if (pendingMigrations.length === 0) {
      await transaction.rollback();
    } else {
      await transaction.commit();
    }

    console.log(
      pendingMigrations.length === 0
        ? "Database migrations are up to date"
        : `Applied ${pendingMigrations.length} database migration(s)`,
    );
  } finally {
    transaction?.close();
    await client.execute("PRAGMA foreign_keys = ON");
  }
}
