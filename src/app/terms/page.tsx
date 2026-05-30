import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/site-metadata";
import { LegalPage, type LegalSection } from "../_components/legal-page";

export const metadata: Metadata = publicPageMetadata({
  title: "Terms and Conditions",
  description: "Terms for using Cloudsurf Texture AI, including accounts, credits, uploaded references, generated outputs, and Paddle payments.",
  path: "/terms-and-conditions",
});

const sections: LegalSection[] = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "Cloudsurf Software Development Services operates Cloudsurf Texture AI. These Terms and Conditions are between you and Cloudsurf Software Development Services.",
      "These Terms and Conditions govern access to Cloudsurf Texture AI, a web application for generating texture atlases, PBR maps, emissive maps, and related digital texture outputs. By creating an account, buying credits, uploading files, or using the service, you agree to these terms.",
      "If you use the service on behalf of a company, studio, or other organization, you represent that you have authority to bind that organization to these terms.",
    ],
  },
  {
    title: "2. Accounts and Security",
    body: [
      "You are responsible for keeping your login credentials secure and for all activity that happens through your account. Notify us promptly if you believe your account has been accessed without authorization.",
      "We may suspend or restrict access if we reasonably believe an account is being misused, used to attack the service, or used in a way that creates legal, security, or operational risk.",
    ],
  },
  {
    title: "3. Credits and Payments",
    body: [
      "Cloudsurf Texture AI uses prepaid credits. Each generation action uses the number of credits shown in the application or pricing page at the time of use. Credits have no cash value, are not a stored-value product, and cannot be transferred outside the service.",
      "Payments are processed through Paddle. Paddle may act as merchant of record or reseller for checkout, tax calculation, invoicing, payment processing, refunds, and chargeback handling. Paddle terms may also apply to your purchase.",
    ],
  },
  {
    title: "4. Uploaded Content and Generated Outputs",
    body: [
      "You retain ownership of images, prompts, project data, and other materials you upload. You grant us a limited license to host, process, transform, store, and transmit that content as needed to provide the service.",
      "Generated texture outputs are made available for your use, subject to these terms and any restrictions from third-party AI providers. You are responsible for confirming that your uploaded materials and generated outputs are suitable for your intended production, commercial, or distribution use.",
    ],
  },
  {
    title: "5. Acceptable Use",
    body: [
      "Do not upload content that you do not have the right to use, content that violates privacy or intellectual property rights, malware, illegal material, or material intended to harm others or interfere with the service.",
      "Do not reverse engineer, overload, scrape, resell, or bypass access controls for the service unless we have given written permission.",
    ],
  },
  {
    title: "6. AI Service Limitations",
    body: [
      "AI-generated outputs may contain visual errors, artifacts, inaccurate material interpretation, or unexpected changes from source references. The service is provided as a workflow tool, not as a guarantee of production-ready accuracy.",
      "You are responsible for reviewing, editing, testing, and validating outputs before using them in simulators, games, architectural visualization, commercial assets, or any other project.",
    ],
  },
  {
    title: "7. Availability and Changes",
    body: [
      "We may update, suspend, or discontinue parts of the service, including credit costs, provider models, storage behavior, or generation limits. We will try to avoid unnecessary disruption, but we do not guarantee uninterrupted availability.",
      "We may update these terms from time to time. Continued use of the service after changes are posted means you accept the updated terms.",
    ],
  },
  {
    title: "8. Disclaimers and Liability",
    body: [
      "The service is provided on an as-is and as-available basis. To the maximum extent allowed by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation.",
      "To the maximum extent allowed by law, our liability for any claim related to the service is limited to the amount you paid for credits in the three months before the event giving rise to the claim.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "For account, billing, or policy questions, contact us through the support channel listed in the application or on your Paddle receipt.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms and Conditions"
      title="Terms for using Cloudsurf Texture AI."
      body="These Terms and Conditions explain how accounts, credits, uploaded references, generated texture outputs, and Paddle payments are handled when you use Cloudsurf Texture AI."
      sections={sections}
    />
  );
}
