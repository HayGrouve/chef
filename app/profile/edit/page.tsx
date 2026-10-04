"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EditProfilePage() {
  const router = useRouter();
  const user = useQuery(api.users.getMe);
  const updateUser = useMutation(api.users.update);

  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

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
      toast.error("Couldn’t save your profile", {
        description: "Check your connection and try again. Your changes are still here.",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
        <h1 className="font-display text-2xl font-bold">Sign in to edit your profile</h1>
        <Button asChild className="mt-6">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" className="pl-0" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Edit profile</h1>
          </CardTitle>
          <CardDescription>Update your public profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={user.name} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Name is managed via your login provider.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              name="avatarUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/my-avatar.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your cooking style…"
              rows={4}
            />
          </div>

          <Button type="submit" disabled={isSaving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving…" : "Save profile"}
          </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
