import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Utilities",
  ...noIndexMetadata,
};

export default function UtilitiesPage() {
  redirect("/dashboard/utilities");
}
