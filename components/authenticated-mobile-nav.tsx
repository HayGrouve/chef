"use client";

import { Authenticated } from "convex/react";
import { MobileNav } from "./mobile-nav";

export function AuthenticatedMobileNav() {
  return (
    <Authenticated>
      <MobileNav />
    </Authenticated>
  );
}

