"use client";

// PROTOTYPE — Cook Mode 2.0 route (full screen).
import { useParams } from "next/navigation";
import { CookMode } from "@/components/prototype/cook/CookMode";

export default function PrototypeCookPage() {
  const { id } = useParams<{ id: string }>();
  return <CookMode id={id} />;
}
