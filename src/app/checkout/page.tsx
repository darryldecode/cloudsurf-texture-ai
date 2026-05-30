import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/site-metadata";
import { PaddleCheckout } from "./paddle-checkout";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Checkout",
  ...noIndexMetadata,
};

export default function CheckoutPage() {
  return <PaddleCheckout />;
}
