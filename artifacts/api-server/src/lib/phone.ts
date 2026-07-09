/** Normalize US phone numbers to E.164 (+1XXXXXXXXXX). */
export function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return phone.trim();
  if (digits.length > 0) return `+${digits}`;
  return phone.trim();
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email?.trim()) return null;
  return email.trim().toLowerCase();
}

export function displayName(
  firstName: string,
  lastName?: string | null,
): string {
  return [firstName.trim(), lastName?.trim()].filter(Boolean).join(" ");
}
