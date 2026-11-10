"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PRIVACY_URL } from "@/lib/legal";

const AKAUNT_URL = "https://onovaza.com/akaunt";
const CONFIRM_WORD = "ИЗТРИЙ";

export default function SettingsPage() {
  const router = useRouter();
  const convex = useConvex();
  const user = useQuery(api.users.getMe);
  const updateUser = useMutation(api.users.update);
  const deleteMyData = useMutation(api.accountDeletion.deleteMyData);
  const storeUser = useMutation(api.users.store);

  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  // The page renders after the profile loads, so the browser's own jump to
  // #danni misses; do it once the section exists.
  const loaded = !!user;
  useEffect(() => {
    if (loaded && window.location.hash === "#danni") {
      document.getElementById("danni")?.scrollIntoView();
    }
  }, [loaded]);

  // The erase removes your profile row last. Once it's gone, start a fresh
  // one (you stay signed in) and land on an empty Кухнята.
  useEffect(() => {
    if (!isErasing || user !== null) return;
    void storeUser().finally(() => {
      toast.success("Данните ти са изтрити.");
      router.replace("/");
    });
  }, [isErasing, user, storeUser, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser({ bio, avatarUrl });
      if (user && user.userId) {
        router.push(`/profile/${user.userId}`);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Не успяхме да запазим страницата ти", {
        description:
          error instanceof ConvexError && typeof error.data === "string"
            ? error.data
            : "Провери връзката си и опитай пак. Промените ти са още тук.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await convex.query(api.accountDeletion.exportMyData, {});
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `onova-za-kuhnyata-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      toast.error("Не успяхме да изтеглим данните ти", {
        description: "Провери връзката си и опитай пак.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleErase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim() !== CONFIRM_WORD) return;
    setIsErasing(true);
    try {
      await deleteMyData({});
    } catch (error) {
      console.error("Failed to delete data:", error);
      setIsErasing(false);
      toast.error("Не успяхме да изтрием данните ти", {
        description: "Провери връзката си и опитай пак.",
      });
    }
  };

  if (isErasing) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center" role="status">
        <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold">Изтриваме данните ти…</h1>
        <p className="mt-2 text-muted-foreground">Остани на тази страница, отнема няколко секунди.</p>
      </div>
    );
  }
  if (user === undefined) {
    return (
      <div className="container mx-auto p-4 max-w-2xl space-y-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }
  if (user === null) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Влез, за да видиш настройките си</h1>
        <Button asChild className="mt-6">
          <Link href="/sign-in?redirect_url=%2Fprofile%2Fedit">Вход</Link>
        </Button>
      </div>
    );
  }

  const confirmed = confirmText.trim() === CONFIRM_WORD;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" className="pl-0" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Назад
        </Button>
      </div>

      <h1 className="font-display text-3xl font-bold mb-6">Настройки</h1>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id="stranitsa-title" className="text-xl">Твоята страница</h2>
            </CardTitle>
            <CardDescription>Това виждат другите на страницата ти на готвач.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Име</Label>
                <Input id="name" value={user.name} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  <a href={AKAUNT_URL} className="underline underline-offset-4 hover:text-foreground">
                    Името си сменяш в Акаунт.
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Линк към снимка</Label>
                <Input
                  id="avatar"
                  name="avatarUrl"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/snimka.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">За теб</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Как готвиш? Какво обичаш да правиш…"
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={isSaving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Запазваме…" : "Запази"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="danni" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>
              <h2 id="danni-title" className="text-xl">Данни</h2>
            </CardTitle>
            <CardDescription>
              Рецептите ти, любимите, списъкът за пазаруване и плановете.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Какво пазим за теб и защо, пише в{" "}
                <a href={PRIVACY_URL} className="font-medium text-foreground underline underline-offset-4">
                  Поверителност
                </a>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                Свали всичко като JSON файл, с линкове към снимките на рецептите.
              </p>
              <Button type="button" variant="outline" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                Изтегли данните си
              </Button>
            </div>

            <form
              onSubmit={handleErase}
              className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5"
            >
              <h3 className="font-semibold text-destructive">Изтрий данните си в онова за кухнята</h3>
              <p className="text-sm">
                Изтриват се рецептите ти, любимите, списъкът за пазаруване и плановете. Публичните ти
                рецепти изчезват и за всички, които са ги запазили или планирали. Няма връщане.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-erase">
                  Напиши {CONFIRM_WORD}, за да потвърдиш
                </Label>
                <Input
                  id="confirm-erase"
                  name="confirm"
                  autoComplete="off"
                  spellCheck={false}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </div>
              <Button type="submit" variant="destructive" disabled={!confirmed}>
                <Trash2 />
                Изтрий данните
              </Button>
            </form>

            <p className="text-sm text-muted-foreground">
              Искаш да изтриеш целия си Акаунт? Това става в{" "}
              <a href={AKAUNT_URL} className="font-medium text-foreground underline underline-offset-4">
                Акаунт
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
