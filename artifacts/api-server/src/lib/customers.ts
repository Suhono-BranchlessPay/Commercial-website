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

  if (existing[0]) {
    customerId = existing[0].id;
    await db
      .update(customersTable)
      .set({
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        email: email ?? existing[0].email,
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
