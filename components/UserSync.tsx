"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function UserSync() {
  const { user } = useUser();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    if (user) {
      storeUser();
    }
  }, [user, storeUser]);

  return null;
}

