/**
 * In-memory store untuk mock API + sesi cookie pengganti Sanctum.
 *
 * Catatan deploy: state ini hidup di memori proses. Di Vercel (serverless)
 * data bertahan selama container warm, dan direset ke seed saat cold start.
 * Cocok untuk demo portfolio — bukan untuk data produksi.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { createSeedData, type MockDb, type ActivityLogRow, type NotificationRow } from "./seed";
import { timestampDaysAgo } from "./random";
import { makeRng } from "./random";

const SESSION_COOKIE = "mybakery_session";
const SESSION_SECRET = "mybakery-demo-session-secret";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

declare global {
  // eslint-disable-next-line no-var
  var __mybakeryMockDb: MockDb | undefined;
}

export function getDb(): MockDb {
  if (!globalThis.__mybakeryMockDb) {
    globalThis.__mybakeryMockDb = createSeedData();
  }
  return globalThis.__mybakeryMockDb;
}

/** ID baru = max(id) + 1 (id unik walau ada record yang dihapus). */
export function newId(rows: { id: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex").slice(0, 32);
}

export function createSessionCookie(userId: number): string {
  const value = `${userId}.${sign(String(userId))}`;
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Cookie CSRF palsu — hanya agar alur `csrf-cookie` FE tetap 200. */
export function csrfCookie(): string {
  return `XSRF-TOKEN=demo; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function readSessionUserId(request: Request): number | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== SESSION_COOKIE) continue;
    const value = rest.join("=");
    const separator = value.indexOf(".");
    if (separator < 0) return null;

    const id = value.slice(0, separator);
    const provided = value.slice(separator + 1);
    const expected = sign(id);
    if (provided.length !== expected.length) return null;

    try {
      if (!timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return null;
    } catch {
      return null;
    }
    const parsed = Number(id);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

export function pushActivityLog(
  db: MockDb,
  userId: number,
  action: string,
  subjectType: string | null,
  subjectId: number | null,
  data: Record<string, unknown> | null
): ActivityLogRow {
  const now = new Date().toISOString();
  const row: ActivityLogRow = {
    id: newId(db.activityLogs),
    user_id: userId,
    action,
    subject_type: subjectType,
    subject_id: subjectId,
    data,
    created_at: now,
    updated_at: now,
  };
  db.activityLogs.unshift(row);
  return row;
}

export function pushNotification(
  db: MockDb,
  userId: number,
  type: string,
  title: string,
  message: string,
  data: Record<string, unknown>
): NotificationRow {
  const row: NotificationRow = {
    id: newId(db.notifications),
    user_id: userId,
    type,
    title,
    message,
    data,
    read_at: null,
    created_at: timestampDaysAgo(0, makeRng()),
  };
  db.notifications.unshift(row);
  return row;
}

/** Notifikasi otomatis saat stok ≤ threshold (mirip NotificationService). */
export function notifyLowStock(db: MockDb, branchId: number, itemId: number): void {
  const stock = db.branchStocks.find((s) => s.branch_id === branchId && s.item_id === itemId);
  const item = db.items.find((i) => i.id === itemId);
  const branch = db.branches.find((b) => b.id === branchId);
  if (!stock || !item || !branch) return;
  if (stock.quantity > item.threshold || stock.quantity <= 0) return;

  const recipients = db.users.filter(
    (u) =>
      (u.role === "branch_admin" && u.branch_id === branchId) || u.role === "super_admin"
  );
  const alreadyNotified = new Set(
    db.notifications
      .filter(
        (n) =>
          n.type === "low_stock" &&
          n.read_at === null &&
          (n.data as { item_id?: number } | null)?.item_id === itemId &&
          (n.data as { branch_id?: number } | null)?.branch_id === branchId
      )
      .map((n) => n.user_id)
  );

  recipients.forEach((recipient) => {
    if (alreadyNotified.has(recipient.id)) return;
    pushNotification(
      db,
      recipient.id,
      "low_stock",
      "Stok Menipis",
      `${item.name} di ${branch.name} tersisa ${stock.quantity} ${item.unit} (threshold: ${item.threshold})`,
      { item_id: item.id, branch_id: branch.id, quantity: stock.quantity, threshold: item.threshold }
    );
  });
}
