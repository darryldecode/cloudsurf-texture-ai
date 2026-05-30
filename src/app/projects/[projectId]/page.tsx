import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Project",
  ...noIndexMetadata,
};

export default function ProjectPage() {
  redirect("/dashboard");
}
