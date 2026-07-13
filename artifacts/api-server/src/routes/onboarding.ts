/**
 * Self-serve onboarding — Blok 3.1 SKELETON ONLY.
 *
 * This is explicitly NOT the production OAuth/C1 flow:
 *  - No live Square client id/secret is read or used anywhere in this file.
 *  - /square/start and /square/callback are 501 stubs.
 *  - /publish is hard-gated behind ONBOARDING_PUBLISH_ENABLED=1 and, even
 *    then, only ever creates a "draft" (inactive) tenants row.
 *  - menu-draft is opaque JSON — never written to live menu tables.
 *
 * Mounted at /api/onboarding (see routes/index.ts) and marked exempt in
 * middleware/tenant.ts since a prospective restaurant has no tenant yet.
 */
import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  ONBOARDING_VARIANTS,
  getOnboardingSessionPublic,
  createOnboardingSession,
  setSessionTheme,
  setSessionVariant,
  setSessionMenuDraft,
  setSessionDomain,
  setSessionSquareOauthState,
  getOnboardingSessionRow,
  publishDraftTenantShell,
  markSessionPublished,
} from "../lib/onboarding";

const router = Router();

function isPublishEnabled(): boolean {
  return process.env.ONBOARDING_PUBLISH_ENABLED === "1";
}

const startSchema = z.object({
  restaurantName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(240).optional(),
  contact: z
    .object({
      email: z.string().trim().email().optional(),
      phone: z.string().trim().max(32).optional(),
      name: z.string().trim().max(120).optional(),
    })
    .partial()
    .optional(),
  cuisine: z.string().trim().max(60).optional(),
});

router.post("/start", async (req, res): Promise<void> => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const session = await createOnboardingSession(parsed.data);
    res.status(201).json({
      session,
      note: "Skeleton onboarding session (Blok 3.1). Not a live tenant yet.",
    });
  } catch (err) {
    req.log?.error({ err }, "Onboarding start failed");
    res.status(500).json({ error: "Failed to start onboarding session" });
  }
});

router.get("/status", async (req, res): Promise<void> => {
  const id = typeof req.query.session === "string" ? req.query.session.trim() : "";
  if (!id) {
    res.status(400).json({ error: "?session=<id> is required" });
    return;
  }
  try {
    const session = await getOnboardingSessionPublic(id);
    if (!session) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    res.json({ session });
  } catch (err) {
    req.log?.error({ err }, "Onboarding status lookup failed");
    res.status(500).json({ error: "Failed to load onboarding status" });
  }
});

const themeSchema = z.object({
  logoUrl: z.string().trim().url().max(500).optional(),
});

router.post("/:id/theme", async (req, res): Promise<void> => {
  const parsed = themeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const session = await setSessionTheme(req.params.id, parsed.data.logoUrl ?? null);
    if (!session) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    res.json({
      session,
      note: "Stub theme: deterministic palette from name hash, not ML.",
    });
  } catch (err) {
    req.log?.error({ err }, "Onboarding theme step failed");
    res.status(500).json({ error: "Failed to set theme" });
  }
});

const variantSchema = z.object({
  variant: z.string().trim().min(1).max(40),
});

router.post("/:id/variant", async (req, res): Promise<void> => {
  const parsed = variantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!ONBOARDING_VARIANTS.includes(parsed.data.variant as never)) {
    res.status(400).json({
      error: `variant must be one of: ${ONBOARDING_VARIANTS.join(", ")}`,
    });
    return;
  }
  try {
    const session = await setSessionVariant(req.params.id, parsed.data.variant);
    if (!session) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    res.json({ session });
  } catch (err) {
    req.log?.error({ err }, "Onboarding variant step failed");
    res.status(500).json({ error: "Failed to set variant" });
  }
});

const menuItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().nonnegative().max(10000).optional(),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
});

const menuDraftSchema = z.object({
  items: z.array(menuItemSchema).max(200),
});

router.post("/:id/menu-draft", async (req, res): Promise<void> => {
  const parsed = menuDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const session = await setSessionMenuDraft(req.params.id, parsed.data.items);
    if (!session) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    res.json({
      session,
      note: "Draft only — not published to the live menu.",
    });
  } catch (err) {
    req.log?.error({ err }, "Onboarding menu-draft step failed");
    res.status(500).json({ error: "Failed to save menu draft" });
  }
});

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

const domainSchema = z.object({
  subdomain: z.string().trim().toLowerCase().max(63).optional(),
  domain: z.string().trim().toLowerCase().max(253).optional(),
});

router.post("/:id/domain", async (req, res): Promise<void> => {
  const parsed = domainSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { subdomain, domain } = parsed.data;
  if (!subdomain && !domain) {
    res.status(400).json({ error: "subdomain or domain is required" });
    return;
  }
  let value: string;
  if (domain) {
    if (!DOMAIN_RE.test(domain)) {
      res.status(400).json({ error: "domain is not a valid hostname" });
      return;
    }
    value = domain;
  } else {
    if (!SUBDOMAIN_RE.test(subdomain!)) {
      res.status(400).json({ error: "subdomain must be lowercase alphanumeric/hyphen" });
      return;
    }
    value = `${subdomain}.orderlyfoods.com`;
  }
  try {
    const session = await setSessionDomain(req.params.id, value);
    if (!session) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    res.json({ session });
  } catch (err) {
    req.log?.error({ err }, "Onboarding domain step failed");
    res.status(500).json({ error: "Failed to set domain" });
  }
});

router.get("/:id/preview", async (req, res): Promise<void> => {
  try {
    const session = await getOnboardingSessionPublic(req.params.id);
    if (!session) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    const menuItems = Array.isArray(
      (session.menuDraft as Record<string, unknown> | null)?.items,
    )
      ? ((session.menuDraft as Record<string, unknown>).items as unknown[])
      : [];
    res.json({
      preview: {
        restaurantName: session.restaurantName,
        address: session.address,
        cuisine: session.cuisine,
        theme: session.theme,
        variant: session.variant,
        domain: session.domain,
        menuItemCount: menuItems.length,
        status: session.status,
      },
      note: "Preview only — nothing here is live/published.",
    });
  } catch (err) {
    req.log?.error({ err }, "Onboarding preview failed");
    res.status(500).json({ error: "Failed to build preview" });
  }
});

/**
 * STUB — no live Square client id/secret is read here. Only records a random
 * CSRF-style state on the session so a future real implementation has
 * somewhere to check it against.
 */
router.post("/:id/square/start", async (req, res): Promise<void> => {
  try {
    const row = await getOnboardingSessionRow(req.params.id);
    if (!row) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    const state = randomUUID();
    await setSessionSquareOauthState(req.params.id, state);
    res.status(501).json({
      error: "Square OAuth is not implemented in this skeleton.",
      note:
        "In the full Blok 3.1 build, this endpoint will redirect to Square's " +
        "authorize URL and /square/callback will exchange the code for a " +
        "per-tenant token. No Square secrets are used here.",
      state,
    });
  } catch (err) {
    req.log?.error({ err }, "Onboarding square/start failed");
    res.status(500).json({ error: "Failed to start Square OAuth stub" });
  }
});

/** STUB — never exchanges a real Square authorization code. */
router.get("/square/callback", (req, res): void => {
  res.status(501).json({
    error: "Square OAuth callback is not implemented in this skeleton.",
    note: "Real implementation will verify state, exchange code, and store per-tenant tokens outside of source control.",
  });
});
router.post("/square/callback", (req, res): void => {
  res.status(501).json({
    error: "Square OAuth callback is not implemented in this skeleton.",
    note: "Real implementation will verify state, exchange code, and store per-tenant tokens outside of source control.",
  });
});

router.post("/:id/publish", async (req, res): Promise<void> => {
  if (!isPublishEnabled()) {
    res.status(501).json({
      error: "Publish is disabled in this skeleton.",
      note: "Set ONBOARDING_PUBLISH_ENABLED=1 to allow creating a draft/inactive tenant shell.",
    });
    return;
  }
  try {
    const row = await getOnboardingSessionRow(req.params.id);
    if (!row) {
      res.status(404).json({ error: "Onboarding session not found" });
      return;
    }
    if (row.status === "published") {
      res.status(409).json({ error: "Session already published" });
      return;
    }
    const { tenantId } = await publishDraftTenantShell(row);
    await markSessionPublished(req.params.id);
    res.json({
      ok: true,
      tenantId,
      status: "draft",
      note: "Draft/inactive tenant shell created. A human must activate it via the normal tenant admin path — no money paths touched.",
    });
  } catch (err) {
    req.log?.error({ err }, "Onboarding publish failed");
    res.status(500).json({ error: "Failed to publish onboarding session" });
  }
});

export default router;
