import { db } from "@workspace/db";
import {
  customersTable,
  addressesTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { StructuredAddress } from "./address";
import { formatAddress } from "./address";
import {
  displayName,
  normalizeEmail,
  normalizePhoneE164,
} from "./phone";

export interface UpsertCustomerInput {
  tenantId: string;
  firstName: string;
  lastName?: string | null;
  phone: string;
  email?: string | null;
  address?: StructuredAddress | null;
  /** Optional marketing consent captured at checkout (default false). */
  marketingConsentEmail?: boolean;
  marketingConsentSms?: boolean;
  consentSource?: string | null;
}

export interface UpsertCustomerResult {
  customerId: string;
  addressId: string | null;
  displayName: string;
  phoneE164: string;
  email: string | null;
  formattedAddress: string | null;
}

export async function upsertCustomerAndAddress(
  input: UpsertCustomerInput,
): Promise<UpsertCustomerResult> {
  const tenantId = input.tenantId;
  const phoneE164 = normalizePhoneE164(input.phone);
  const email = normalizeEmail(input.email);
  const name = displayName(input.firstName, input.lastName);

  const existing = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.tenantId, tenantId),
        eq(customersTable.phone, phoneE164),
      ),
    )
    .limit(1);

  let customerId: string;
  const now = new Date();
  const wantsEmailConsent = Boolean(input.marketingConsentEmail);
  const wantsSmsConsent = Boolean(input.marketingConsentSms);
  const consentTouched = wantsEmailConsent || wantsSmsConsent;

  if (existing[0]) {
    customerId = existing[0].id;
    await db
      .update(customersTable)
      .set({
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        email: email ?? existing[0].email,
        ...(consentTouched
          ? {
              marketingConsentEmail:
                wantsEmailConsent || existing[0].marketingConsentEmail,
              marketingConsentSms:
                wantsSmsConsent || existing[0].marketingConsentSms,
              consentTimestamp: now,
              consentSource: input.consentSource ?? "checkout",
            }
          : {}),
      })
      .where(eq(customersTable.id, customerId));
  } else {
    customerId = randomUUID();
    await db.insert(customersTable).values({
      id: customerId,
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || null,
      phone: phoneE164,
      email,
      orderCount: 0,
      totalSpentCents: 0,
      marketingConsentEmail: wantsEmailConsent,
      marketingConsentSms: wantsSmsConsent,
      consentTimestamp: consentTouched ? now : null,
      consentSource: consentTouched ? (input.consentSource ?? "checkout") : null,
    });
  }

  let addressId: string | null = null;
  let formattedAddress: string | null = null;

  if (input.address) {
    formattedAddress = formatAddress(input.address);
    const addr = input.address;

    const existingAddresses = await db
      .select()
      .from(addressesTable)
      .where(
        and(
          eq(addressesTable.tenantId, tenantId),
          eq(addressesTable.customerId, customerId),
          eq(addressesTable.street, addr.street.trim()),
          eq(addressesTable.postcode, addr.postcode.trim()),
        ),
      )
      .limit(1);

    if (existingAddresses[0]) {
      addressId = existingAddresses[0].id;
      await db
        .update(addressesTable)
        .set({
          unit: addr.unit?.trim() || null,
          city: addr.city.trim(),
          state: addr.state.trim().toUpperCase(),
          lat: addr.lat,
          lng: addr.lng,
        })
        .where(eq(addressesTable.id, addressId));
    } else {
      addressId = randomUUID();
      await db.insert(addressesTable).values({
        id: addressId,
        tenantId,
        customerId,
        street: addr.street.trim(),
        unit: addr.unit?.trim() || null,
        city: addr.city.trim(),
        state: addr.state.trim().toUpperCase(),
        postcode: addr.postcode.trim(),
        lat: addr.lat,
        lng: addr.lng,
        isDefault: false,
      });
    }

    await db
      .update(addressesTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(addressesTable.customerId, customerId),
          eq(addressesTable.tenantId, tenantId),
        ),
      );

    await db
      .update(addressesTable)
      .set({ isDefault: true })
      .where(eq(addressesTable.id, addressId));
  }

  return {
    customerId,
    addressId,
    displayName: name,
    phoneE164,
    email,
    formattedAddress,
  };
}

/** After a paid order is persisted — update CRM aggregates (tenant-scoped). */
export async function recordCustomerPaidOrder(input: {
  tenantId: string;
  customerId: string;
  totalCents: number;
  orderedAt?: Date;
}): Promise<void> {
  const orderedAt = input.orderedAt ?? new Date();
  const spent = Math.max(0, Math.round(input.totalCents));

  const rows = await db
    .select()
    .from(customersTable)
    .where(
      and(
        eq(customersTable.id, input.customerId),
        eq(customersTable.tenantId, input.tenantId),
      ),
    )
    .limit(1);

  const customer = rows[0];
  if (!customer) return;

  await db
    .update(customersTable)
    .set({
      orderCount: customer.orderCount + 1,
      totalSpentCents: customer.totalSpentCents + spent,
      lastOrderAt: orderedAt,
      firstOrderAt: customer.firstOrderAt ?? orderedAt,
    })
    .where(
      and(
        eq(customersTable.id, input.customerId),
        eq(customersTable.tenantId, input.tenantId),
      ),
    );
}
