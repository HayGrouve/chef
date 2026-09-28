"use client";

import { useParams } from "next/navigation";
import { CookMode } from "@/components/cook/CookMode";

export default function CookPage() {
  const { id } = useParams<{ id: string }>();
  return <CookMode id={id} />;
}
