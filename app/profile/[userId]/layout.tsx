import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const user = await fetchQuery(api.users.get, { userId }).catch(() => null);
  return { title: user ? user.name : "Profile" };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
