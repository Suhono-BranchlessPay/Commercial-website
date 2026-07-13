/**
 * Blok 4.1 — Social media TRIAL skeleton business logic.
 *
 * HARD RULES (enforced here, not just in the docs):
 *  - Nothing in this file calls a real Meta send API. /send is a stub.
 *  - allergy_health and spam classifications are never auto-drafted.
 *  - complaint is drafted for human review, never auto-sent.
 *  - Every state change writes a social_reply_audit row.
 * See docs/BLOK4_SOCIAL_TRIAL.md.
 */
import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  socialInboxTable,
  socialReplyAuditTable,
  type SocialInboxRow,
  type SocialClassification,
  type SocialInboxStatus,
  type SocialAuditAction,
} from "@workspace/db";
import { classifySocialMessage } from "./socialClassify";
import { buildDraftReply, buildEscalationNote } from "./socialDraft";
import {
  getBrandVoiceHint,
  getMetaPageAccessToken,
  isSocialKillSwitchOn,
  isSocialSendGloballyEnabled,
} from "./socialConfig";

export type CreateInboxInput = {
  tenantId: string;
  platform: "facebook" | "instagram";
  externalThreadId?: string | null;
  externalMessageId?: string | null;
  authorName?: string | null;
  body?: string | null;
  raw?: Record<string, unknown>;
};

async function writeAudit(input: {
  tenantId: string;
  inboxId: string;
  action: SocialAuditAction;
  actor: string;
  beforeBody?: string | null;
  afterBody?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(socialReplyAuditTable).values({
    id: randomUUID(),
    tenantId: input.tenantId,
    inboxId: input.inboxId,
    action: input.action,
    actor: input.actor,
    beforeBody: input.beforeBody ?? null,
    afterBody: input.afterBody ?? null,
    meta: input.meta ?? {},
  });
}

/**
 * Always creates a row (or is a no-op on webhook retry duplicates). NEVER
 * sends a reply. Classification is heuristic-only and stored for triage.
 */
export async function ingestInboundMessage(
  input: CreateInboxInput,
): Promise<SocialInboxRow | null> {
  const { classification, riskFlags } = classifySocialMessage(input.body);

  const inserted = await db
    .insert(socialInboxTable)
    .values({
      id: randomUUID(),
      tenantId: input.tenantId,
      platform: input.platform,
      externalThreadId: input.externalThreadId ?? null,
      externalMessageId: input.externalMessageId ?? null,
      direction: "in",
      authorName: input.authorName ?? null,
      body: input.body ?? null,
      classification,
      status: "new",
      riskFlags,
      raw: input.raw ?? {},
    })
    .onConflictDoNothing({
      target: [
        socialInboxTable.tenantId,
        socialInboxTable.platform,
        socialInboxTable.externalMessageId,
      ],
    })
    .returning();

  return inserted[0] ?? null;
}

export async function listInbox(params: {
  tenantId: string | null;
  status?: string | null;
  limit?: number;
}): Promise<SocialInboxRow[]> {
  const conditions = [];
  if (params.tenantId) conditions.push(eq(socialInboxTable.tenantId, params.tenantId));
  if (params.status) conditions.push(eq(socialInboxTable.status, params.status));

  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

  const query = db.select().from(socialInboxTable);
  const rows = conditions.length
    ? await query
        .where(and(...conditions))
        .orderBy(desc(socialInboxTable.createdAt))
        .limit(limit)
    : await query.orderBy(desc(socialInboxTable.createdAt)).limit(limit);
  return rows;
}

export async function getInboxRow(id: string): Promise<SocialInboxRow | null> {
  const rows = await db
    .select()
    .from(socialInboxTable)
    .where(eq(socialInboxTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

async function updateInboxRow(
  id: string,
  set: Partial<typeof socialInboxTable.$inferInsert>,
): Promise<SocialInboxRow | null> {
  const rows = await db
    .update(socialInboxTable)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(socialInboxTable.id, id))
    .returning();
  return rows[0] ?? null;
}

export type DraftResult = {
  row: SocialInboxRow;
  escalate: boolean;
  note: string | null;
};

/**
 * Generates (or refuses to generate) a draft reply based on classification.
 * allergy_health -> blocked, no draft, escalate=true.
 * spam -> skipped, no draft.
 * everything else -> pending_approval with a template draft a human must review.
 */
export async function draftReplyForRow(
  id: string,
  tenantName: string,
  actor: string,
): Promise<DraftResult | null> {
  const row = await getInboxRow(id);
  if (!row) return null;

  const classification = row.classification as SocialClassification;

  if (classification === "allergy_health") {
    const updated = await updateInboxRow(id, {
      draftReply: null,
      status: "blocked",
    });
    await writeAudit({
      tenantId: row.tenantId,
      inboxId: id,
      action: "block",
      actor,
      meta: { reason: "allergy_health_keyword", note: buildEscalationNote(classification) },
    });
    return { row: updated ?? row, escalate: true, note: buildEscalationNote(classification) };
  }

  if (classification === "spam") {
    const updated = await updateInboxRow(id, {
      draftReply: null,
      status: "skipped",
    });
    await writeAudit({
      tenantId: row.tenantId,
      inboxId: id,
      action: "skip",
      actor,
      meta: { reason: "spam_keyword", note: buildEscalationNote(classification) },
    });
    return { row: updated ?? row, escalate: false, note: buildEscalationNote(classification) };
  }

  const draft = buildDraftReply({
    classification,
    authorName: row.authorName,
    tenantName,
    brandVoiceHint: getBrandVoiceHint(row.tenantId),
  });

  const updated = await updateInboxRow(id, {
    draftReply: draft,
    status: "pending_approval",
  });

  const isComplaint = classification === "complaint";
  return {
    row: updated ?? row,
    escalate: isComplaint,
    note: isComplaint
      ? "Complaint drafted for review only — hard rule forbids auto-sending complaint replies. Alert the owner."
      : null,
  };
}

export type ApproveResult =
  | { ok: true; row: SocialInboxRow }
  | { ok: false; error: string };

export async function approveInboxRow(
  id: string,
  editedBody: string | undefined,
  actor: string,
): Promise<ApproveResult> {
  const row = await getInboxRow(id);
  if (!row) return { ok: false, error: "Inbox row not found" };

  if (row.status !== "pending_approval" && row.status !== "drafted") {
    return {
      ok: false,
      error: `Cannot approve from status "${row.status}" (expected pending_approval or drafted)`,
    };
  }
  if (row.classification === "allergy_health") {
    return { ok: false, error: "Blocked classification (allergy_health) cannot be approved" };
  }

  const finalBody = editedBody?.trim() ? editedBody.trim() : row.draftReply;
  if (!finalBody) {
    return { ok: false, error: "No draft or edited_body to approve" };
  }

  const updated = await updateInboxRow(id, {
    draftReply: finalBody,
    status: "approved",
  });

  await writeAudit({
    tenantId: row.tenantId,
    inboxId: id,
    action: editedBody?.trim() && editedBody.trim() !== row.draftReply ? "edit" : "approve",
    actor,
    beforeBody: row.draftReply,
    afterBody: finalBody,
    meta: { edited: Boolean(editedBody?.trim() && editedBody.trim() !== row.draftReply) },
  });

  return { ok: true, row: updated ?? row };
}

export async function skipInboxRow(
  id: string,
  actor: string,
  reason?: string,
): Promise<SocialInboxRow | null> {
  const row = await getInboxRow(id);
  if (!row) return null;
  const updated = await updateInboxRow(id, { status: "skipped" });
  await writeAudit({
    tenantId: row.tenantId,
    inboxId: id,
    action: "skip",
    actor,
    beforeBody: row.draftReply,
    meta: reason ? { reason } : {},
  });
  return updated ?? row;
}

export type SendResult =
  | { ok: true; row: SocialInboxRow; sent: "stub" }
  | { ok: false; status: number; error: string };

/**
 * Stub send — this NEVER calls the real Meta Graph API. It only exists to
 * prove the gate logic (kill switch, classification, approval, env flags)
 * before real sending is implemented. Every call is audited regardless of
 * outcome.
 */
export async function sendApprovedReply(id: string, actor: string): Promise<SendResult> {
  const row = await getInboxRow(id);
  if (!row) return { ok: false, status: 404, error: "Inbox row not found" };

  if (isSocialKillSwitchOn(row.tenantId)) {
    await writeAudit({
      tenantId: row.tenantId,
      inboxId: id,
      action: "kill_switch",
      actor,
      meta: { blocked_send: true },
    });
    return { ok: false, status: 403, error: `Kill switch is ON for tenant "${row.tenantId}"` };
  }

  if (
    row.classification === "allergy_health" ||
    row.classification === "complaint" ||
    row.classification === "spam"
  ) {
    return {
      ok: false,
      status: 403,
      error: `Classification "${row.classification}" may never be auto-sent through this endpoint (hard rule)`,
    };
  }

  if (row.status !== "approved") {
    return { ok: false, status: 409, error: `Row must be status "approved" (currently "${row.status}")` };
  }

  if (!isSocialSendGloballyEnabled()) {
    return {
      ok: false,
      status: 501,
      error: "Sending is disabled — set SOCIAL_SEND_ENABLED=1 to allow the send gate to open (still stub-only).",
    };
  }

  const token = getMetaPageAccessToken(row.tenantId);
  if (!token) {
    return {
      ok: false,
      status: 501,
      error: `No META_PAGE_ACCESS_TOKEN configured for tenant "${row.tenantId}" — real Meta send is not implemented yet.`,
    };
  }

  // STUB: real implementation will call Meta's Graph API here with `token`.
  // Intentionally not implemented — see docs/BLOK4_SOCIAL_TRIAL.md.
  const updated = await updateInboxRow(id, { status: "sent" });
  await writeAudit({
    tenantId: row.tenantId,
    inboxId: id,
    action: "send",
    actor,
    beforeBody: row.draftReply,
    afterBody: row.draftReply,
    meta: { stub: true, note: "No real Meta Graph API call was made — send is stubbed." },
  });

  return { ok: true, row: updated ?? row, sent: "stub" };
}

export async function listAuditForInbox(inboxId: string) {
  return db
    .select()
    .from(socialReplyAuditTable)
    .where(eq(socialReplyAuditTable.inboxId, inboxId))
    .orderBy(desc(socialReplyAuditTable.createdAt));
}

export type SocialTenantHealth = {
  tenant_id: string;
  kill_switch: boolean;
  send_globally_enabled: boolean;
  meta_token_configured: boolean;
};

export function buildSocialHealth(tenantIds: string[]): {
  send_globally_enabled: boolean;
  tenants: SocialTenantHealth[];
} {
  return {
    send_globally_enabled: isSocialSendGloballyEnabled(),
    tenants: tenantIds.map((tenantId) => ({
      tenant_id: tenantId,
      kill_switch: isSocialKillSwitchOn(tenantId),
      send_globally_enabled: isSocialSendGloballyEnabled(),
      meta_token_configured: Boolean(getMetaPageAccessToken(tenantId)),
    })),
  };
}

export function toPublicInboxRow(row: SocialInboxRow) {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    platform: row.platform,
    external_thread_id: row.externalThreadId,
    external_message_id: row.externalMessageId,
    direction: row.direction,
    author_name: row.authorName,
    body: row.body,
    classification: row.classification,
    draft_reply: row.draftReply,
    status: row.status as SocialInboxStatus,
    risk_flags: row.riskFlags,
    created_at: row.createdAt?.toISOString?.() ?? row.createdAt,
    updated_at: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}
