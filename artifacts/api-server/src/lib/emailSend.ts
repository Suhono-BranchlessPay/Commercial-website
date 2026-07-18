/**
 * Thin email sender — Resend HTTP API (no SDK dependency).
 * Secrets only from env: RESEND_API_KEY, DAILY_REPORT_FROM.
 */
import { logger } from "./logger";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.DAILY_REPORT_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    "";

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set" };
  }
  if (!from) {
    return {
      ok: false,
      error: "DAILY_REPORT_FROM (or RESEND_FROM) is not set",
    };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      const msg =
        body.error?.message || body.message || `Resend HTTP ${res.status}`;
      logger.warn({ status: res.status, msg }, "email send failed");
      return { ok: false, error: msg };
    }
    return { ok: true, id: body.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
