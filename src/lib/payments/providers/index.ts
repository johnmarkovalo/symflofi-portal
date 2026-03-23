import type { PaymentProvider } from "../types";
import { XenditProvider } from "./xendit";
import { PayMongoProvider } from "./paymongo";

const PROVIDER = process.env.PAYMENT_PROVIDER || "xendit";

let cached: PaymentProvider | null = null;

export function getProvider(): PaymentProvider {
  if (cached) return cached;

  switch (PROVIDER) {
    case "xendit":
      cached = new XenditProvider();
      break;
    case "paymongo":
      cached = new PayMongoProvider();
      break;
    default:
      throw new Error(`Unknown payment provider: ${PROVIDER}`);
  }

  return cached;
}
