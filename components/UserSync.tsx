"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { InstallDialog } from "./install-dialog";

/** Chrome's install prompt event; not in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/**
 * Keeps the Convex profile in step with the Clerk user, and offers the install
 * prompt once: on the call that creates the profile, so for a new chef only.
 */
export function UserSync() {
  const { user } = useUser();
  const storeUser = useMutation(api.users.store);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    void storeUser().then((result) => {
      if (!result?.created) return;
      setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));
      setShowInstall(true);
    });
  }, [user, storeUser]);

  return (
    <InstallDialog
      open={showInstall}
      onOpenChange={setShowInstall}
      isIOS={isIOS}
      onInstall={() => {
        void installPrompt?.prompt();
        setShowInstall(false);
      }}
    />
  );
}
