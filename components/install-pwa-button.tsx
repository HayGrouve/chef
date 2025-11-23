"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { InstallDialog } from "./install-dialog";

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
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Handle Android/Chrome install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
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
            Install App
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

