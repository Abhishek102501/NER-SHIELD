import type { Metadata } from "next";
import CommandCenter from "@/components/layout/CommandCenter";

export const metadata: Metadata = {
  title: "Command Center · NER-SHIELD",
  description:
    "NER-SHIELD GIS command center — live risk zones, incidents, and AI intelligence for the North Eastern Region.",
};

export default function CommandPage() {
  return (
    <div className="h-dvh overflow-hidden">
      <CommandCenter />
    </div>
  );
}
