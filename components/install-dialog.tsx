"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Share, PlusSquare, Download } from "lucide-react";

interface InstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isIOS: boolean;
  onInstall: () => void;
}

export function InstallDialog({
  open,
  onOpenChange,
  isIOS,
  onInstall,
}: InstallDialogProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Инсталирай Кухнята</DrawerTitle>
          <DrawerDescription>
            Сложи Кухнята на началния екран и я отваряй като приложение.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-0">
          {isIOS ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                  <Share className="h-6 w-6" />
                </div>
                <p className="text-sm">
                  1. Натисни бутона <strong>Сподели</strong> в лентата.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-muted p-2 rounded-md">
                  <PlusSquare className="h-6 w-6" />
                </div>
                <p className="text-sm">
                  2. Избери <strong>Добави към началния екран</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-center text-muted-foreground">
                Отваряй Кухнята от началния екран, като всяко друго приложение.
              </p>
              <Button size="lg" onClick={onInstall} className="w-full max-w-sm">
                <Download className="mr-2 h-4 w-4" />
                Инсталирай
              </Button>
            </div>
          )}
        </div>
        <DrawerFooter className="flex flex-col items-center">
          {!isIOS && (
            <DrawerClose asChild>
              <Button variant="outline" className="w-full max-w-sm">Не сега</Button>
            </DrawerClose>
          )}
          {isIOS && (
            <DrawerClose asChild>
               <Button variant="secondary">Затвори</Button>
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

