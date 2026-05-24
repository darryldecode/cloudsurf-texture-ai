import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "../_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Cloudsurf Texture AI",
  description: "Privacy policy for Cloudsurf Texture AI.",
};

const sections: LegalSection[] = [
  {
    title: "1. Information We Collect",
    body: [
      "We collect account information such as your name, email address, authentication identifiers, and profile image when provided through the login provider.",
      "We collect project and workflow data that you create in the service, including project names, workflow names, prompts, exclusions, reference image metadata, generated texture metadata, credit balances, and credit transaction history.",
      "We process uploaded reference images and generated outputs so the application can store, display, download, and regenerate texture assets.",
    ],
  },
  {
    title: "2. Payment Information",
    body: [
      "Payments are handled by Paddle. We do not intentionally store full payment card numbers or bank account details. We may receive payment status, transaction identifiers, purchased credit pack details, customer contact details, tax information, refund status, and fraud or dispute signals from Paddle.",
      "Paddle's own privacy notices and checkout terms may apply to information that Paddle collects during payment.",
    ],
  },
  {
    title: "3. How We Use Information",
    body: [
      "We use information to provide the service, authenticate users, maintain projects, generate AI texture outputs, store generated assets, show account balances, process credit purchases, prevent abuse, troubleshoot issues, and improve reliability.",
      "We may use aggregated or de-identified operational information to understand usage patterns, capacity needs, error rates, and product performance.",
    ],
  },
  {
    title: "4. AI Providers and Infrastructure",
    body: [
      "To generate outputs, we may send prompts, uploaded images, generated intermediate files, and related metadata to configured AI providers such as OpenAI or Google. Provider processing is necessary to create the requested texture outputs.",
      "We use infrastructure providers for database hosting, object storage, authentication, deployment, logging, and payment processing. These providers process information on our behalf or as independent processors according to their own terms.",
    ],
  },
  {
    title: "5. Cookies and Local Storage",
    body: [
      "We use cookies or similar technologies for authentication, session management, security, and basic application operation. The app may also use browser storage to keep local workspace state and previews.",
      "You can control cookies through your browser settings, but disabling required cookies may prevent login or other core features from working.",
    ],
  },
  {
    title: "6. Data Retention",
    body: [
      "We keep account, project, credit, and generated asset records for as long as needed to provide the service, comply with legal or tax obligations, resolve disputes, maintain security, and support backups.",
      "You may request deletion of your account or project data. Some records, such as transaction, refund, dispute, security, or legal records, may be retained where required or reasonably necessary.",
    ],
  },
  {
    title: "7. Sharing Information",
    body: [
      "We do not sell personal information. We share information with service providers when needed to operate the app, process payments, generate outputs, provide storage, investigate abuse, comply with law, or protect rights and safety.",
      "If the business is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction subject to appropriate safeguards.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect information. No internet service can guarantee perfect security, and you are responsible for keeping your account credentials safe.",
    ],
  },
  {
    title: "9. Your Choices",
    body: [
      "Depending on your location, you may have rights to access, correct, delete, export, or object to certain processing of personal information. You can contact us through the support channel listed in the application or your Paddle receipt.",
      "If your request relates to payment data processed by Paddle, Paddle may need to handle that request directly or in coordination with us.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="How Cloudsurf Texture AI handles data."
      body="This Privacy Policy explains how Cloudsurf Texture AI collects, uses, stores, and shares account, project, uploaded image, generated asset, payment, and provider data."
      sections={sections}
    />
  );
}
