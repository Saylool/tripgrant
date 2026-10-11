import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import type { Activity, FundInput } from "../shared/types.js";

mkdirSync(".local/data", { recursive: true });
export const db = new DatabaseSync(".local/data/tripgrant.sqlite");
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS grants (
    address TEXT PRIMARY KEY, event_name TEXT NOT NULL, student_name TEXT NOT NULL,
    destination TEXT NOT NULL, purpose TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY, grant_address TEXT NOT NULL, uploader TEXT NOT NULL,
    hash TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL, created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activities (
    signature TEXT PRIMARY KEY, grant_address TEXT NOT NULL, kind TEXT NOT NULL,
    actor TEXT NOT NULL, created_at INTEGER NOT NULL, amount TEXT NOT NULL, description TEXT NOT NULL
  );
`);
export function metadata(address: string) {
  return db.prepare("SELECT * FROM grants WHERE address = ?").get(address) as
    | {
        event_name: string;
        student_name: string;
        destination: string;
        purpose: string;
      }
    | undefined;
}
export function saveMetadata(address: string, input: FundInput) {
  db.prepare("INSERT OR IGNORE INTO grants VALUES (?, ?, ?, ?, ?)").run(
    address,
    input.eventName,
    input.studentName,
    input.destination,
    input.purpose,
  );
}
export function saveActivity(activity: Activity) {
  db.prepare(
    "INSERT OR IGNORE INTO activities VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    activity.signature,
    activity.grant,
    activity.kind,
    activity.actor,
    activity.createdAt,
    activity.amount,
    activity.description,
  );
}
export function activities(addresses: string[]): Activity[] {
  if (!addresses.length) return [];
  const rows = db
    .prepare(
      `SELECT * FROM activities WHERE grant_address IN (${addresses.map(() => "?").join(",")}) ORDER BY created_at DESC, rowid DESC LIMIT 80`,
    )
    .all(...addresses) as any[];
  return rows.map((r) => ({
    signature: r.signature,
    grant: r.grant_address,
    kind: r.kind,
    actor: r.actor,
    createdAt: r.created_at,
    amount: r.amount,
    description: r.description,
  }));
}
export interface Receipt {
  id: string;
  grant_address: string;
  uploader: string;
  hash: string;
  name: string;
  mime: string;
  content: Uint8Array;
  created_at: number;
}
export function receiptById(id: string): Receipt | undefined {
  return db.prepare("SELECT * FROM receipts WHERE id = ?").get(id) as
    Receipt | undefined;
}
export function receiptByCommitment(
  address: string,
  hash: string,
): Receipt | undefined {
  return db
    .prepare(
      "SELECT * FROM receipts WHERE grant_address = ? AND hash = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(address, hash) as Receipt | undefined;
}
