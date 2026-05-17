import { dbPromise } from "../db";
import API from "../api/api";

/**
 * Generate unique idempotency key
 * Prevents duplicate payments during retries / offline sync
 */
function generateIdempotencyKey() {
  return (
    "PAY-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 10)
  );
}

/**
 * Save payment (Offline-first)
 * 1. Saves locally first
 * 2. Attempts server sync
 * 3. Falls back to offline queue if failed
 */
export async function savePayment(payment) {
  const db = await dbPromise;

  const idempotencyKey = generateIdempotencyKey();

  const payload = {
    ...payment,
    idempotency_key: idempotencyKey,
  };

  // =========================
  // 1. SAVE LOCALLY FIRST
  // =========================
  const localId = await db.add("payments", {
    ...payload,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  });

  // =========================
  // 2. ADD TO SYNC QUEUE
  // =========================
  await db.add("syncQueue", {
    type: "PAYMENT",
    payload: {
      ...payload,
      localId,
    },
    createdAt: new Date().toISOString(),
  });

  // =========================
  // 3. TRY IMMEDIATE SYNC
  // =========================
  try {
    const { data } = await API.post("/payments", payload);

    // Update local record → SYNCED
    await db.put("payments", {
      id: localId,
      ...data.payment,
      status: "SYNCED",
    });

    // Remove from sync queue if exists
    const queueItems = await db.getAll("syncQueue");
    const item = queueItems.find(
      (q) => q.payload.localId === localId
    );

    if (item) {
      await db.delete("syncQueue", item.id);
    }

    return {
      success: true,
      synced: true,
      payment: data.payment,
    };
  } catch (err) {
    console.log("📴 Offline mode — payment stored locally");

    return {
      success: true,
      synced: false,
      localId,
    };
  }
}

/**
 * Get all local payments (for UI)
 */
export async function getLocalPayments() {
  const db = await dbPromise;
  const payments = await db.getAll("payments");

  return payments.sort((a, b) => b.id - a.id);
}

/**
 * Delete local payment (rare use case)
 */
export async function deleteLocalPayment(id) {
  const db = await dbPromise;
  await db.delete("payments", id);
}