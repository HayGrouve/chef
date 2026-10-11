"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { InstallDialog } from "./install-dialog";

/** Chrome's install prompt event; not in the DOM typings yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const subscribeNoop = () => () => {};
const isIOSDevice = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

interface InstallPwaButtonProps {
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function InstallPwaButton({ 
  children, 
  className,
  variant = "outline",
  size = "sm"
}: InstallPwaButtonProps) {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  // Read on the client only, so the server render and hydration agree
  const isIOS = useSyncExternalStore(subscribeNoop, isIOSDevice, () => false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Handle Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = (evt: React.MouseEvent | undefined) => {
    if (evt) evt.preventDefault();
    
    if (isIOS) {
      setShowDialog(true);
      return;
    }

    if (!promptInstall) {
      return;
    }
    
    promptInstall.prompt();
  };

  const onInstallClick = () => {
      if(!promptInstall){
          return
      }
      promptInstall.prompt();
  }

  // Always show for iOS (since we can give instructions) or if prompt is available
  if (!isIOS && !supportsPWA) {
    return null;
  }

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        onClick={handleInstall}
      >
        {children || (
          <>
            <Download className="h-4 w-4 mr-2" />
            Install app
          </>
        )}
      </Button>

      <InstallDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
        isIOS={isIOS}
        onInstall={onInstallClick}
      />
    </>
  );
}

