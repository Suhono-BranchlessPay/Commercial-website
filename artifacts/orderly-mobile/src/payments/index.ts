/**
 * Payment provider abstraction — Square now, Stripe later.
 * App never holds Square/Stripe/BP secrets; only public applicationId from /api/square/config.
 */

export type PaymentTokenResult = {
  sourceId: string;
  provider: "square" | "stripe";
};

export type PaymentProvider = {
  id: "square" | "stripe";
  /** Collect card on device and return a token/nonce for POST /api/orders */
  tokenizeCard: (opts: {
    amountCents: number;
    applicationId?: string;
    locationId?: string;
    environment?: string;
  }) => Promise<PaymentTokenResult>;
};

/**
 * Dev / Expo Go fallback.
 * Square sandbox accepts known test nonces when backend is in sandbox.
 * Production builds must use Square In-App Payments SDK (dev client / EAS).
 */
export const squareDevProvider: PaymentProvider = {
  id: "square",
  async tokenizeCard({ environment }) {
    const useTest =
      process.env.EXPO_PUBLIC_SQUARE_TEST_NONCE === "1" ||
      environment === "sandbox";
    if (!useTest) {
      throw new Error(
        "Square In-App Payments SDK required for production. Build with EAS + react-native-square-in-app-payments.",
      );
    }
    // Official Square sandbox test nonce (never use in production)
    return { sourceId: "cnon:card-nonce-ok", provider: "square" };
  },
};

/** Placeholder for future Stripe Connect — swap factory only. */
export const stripeStubProvider: PaymentProvider = {
  id: "stripe",
  async tokenizeCard() {
    throw new Error("Stripe Connect not live yet — use Square.");
  },
};

export function getPaymentProvider(): PaymentProvider {
  const prefer = process.env.EXPO_PUBLIC_PAYMENT_PROVIDER || "square";
  if (prefer === "stripe") return stripeStubProvider;
  return squareDevProvider;
}
