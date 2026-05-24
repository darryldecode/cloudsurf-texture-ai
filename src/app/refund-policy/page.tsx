import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy | Cloudsurf Texture AI",
  description: "Refund policy for Cloudsurf Texture AI credit purchases.",
};

const sections: LegalSection[] = [
  {
    title: "1. Credit Purchases",
    body: [
      "Cloudsurf Texture AI sells prepaid credit packs for AI texture generation. Credits are added to your account after Paddle confirms the transaction.",
      "Credits are intended for use inside the service only. They are not cash, are not a banked balance, and cannot be transferred or redeemed outside Cloudsurf Texture AI.",
    ],
  },
  {
    title: "2. Refund Eligibility",
    body: [
      "We generally consider refund requests for unused credit purchases made in error, duplicate purchases, accidental purchases, or cases where the service is materially unavailable shortly after purchase.",
      "Refund requests should be made within 14 days of purchase. Requests made after that period may be declined unless required by law or approved at our discretion.",
    ],
  },
  {
    title: "3. Used Credits",
    body: [
      "Credits that have already been used for generation are generally non-refundable because AI provider and infrastructure costs are incurred when generation runs.",
      "If a generation request fails server-side after a credit is debited, the application is designed to return the credit automatically. If that does not happen, contact support with the workflow and transaction details.",
    ],
  },
  {
    title: "4. Output Quality",
    body: [
      "AI-generated texture outputs may require review, editing, or regeneration. Dissatisfaction with subjective output quality does not automatically qualify for a refund once credits have been used.",
      "We may offer troubleshooting help, account credit adjustments, or other remedies at our discretion when a reproducible service issue affects generation quality or availability.",
    ],
  },
  {
    title: "5. Paddle Processing",
    body: [
      "Payments and refunds are processed through Paddle. Paddle may act as merchant of record or reseller and may review, approve, or decline refund requests according to its checkout and payment policies.",
      "Approved refunds are returned to the original payment method where possible. Bank, card network, tax, currency conversion, and payment processor timing may affect when funds appear.",
    ],
  },
  {
    title: "6. Abuse and Chargebacks",
    body: [
      "We may decline refunds, suspend accounts, or revoke credits where we identify fraud, abuse, policy violations, unauthorized resale, payment disputes, or attempts to exploit the credit system.",
      "If you believe a charge is incorrect, contact support or Paddle before filing a chargeback so the issue can be reviewed quickly.",
    ],
  },
  {
    title: "7. How to Request a Refund",
    body: [
      "Send the account email, Paddle transaction ID, purchase date, credit pack, and reason for the request through the support channel listed in the application or on your Paddle receipt.",
      "We may ask for additional information needed to confirm account ownership, transaction status, credit usage, and whether the request qualifies under this policy.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Refund Policy"
      title="Refunds for Cloudsurf Texture AI credits."
      body="This generic policy describes when prepaid credit purchases may be refunded, how used credits are handled, and how Paddle payment processing fits into the flow."
      sections={sections}
    />
  );
}
