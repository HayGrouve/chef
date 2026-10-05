"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User as UserIcon, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeCardSkeleton } from "@/components/RecipeCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const user = useQuery(api.users.get, { userId });
  const currentUser = useQuery(api.users.getMe);
  
  const recipes = useQuery(api.recipes.listPublic, { userId });

  if (user === undefined) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center gap-4 pt-16">
        <Skeleton className="w-24 h-24 rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    );
  }
  if (user === null) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Cook not found</h1>
        <p className="mt-2 text-muted-foreground">This profile doesn’t exist or was removed.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">
            <ArrowLeft /> Back to Cook
          </Link>
        </Button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.userId === userId;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <Button asChild variant="ghost" className="pl-0">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cook
          </Link>
        </Button>
        {isOwnProfile && (
          <Button asChild variant="outline">
            <Link href="/profile/edit">
              <Edit className="w-4 h-4 mr-2" /> Edit profile
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-4 relative">
            {user.avatarUrl ? (
                // Avatars can be any https link, not just the hosts next.config allows
                <Image src={user.avatarUrl} alt={user.name} fill sizes="96px" className="object-cover" unoptimized />
            ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
            )}
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">{user.name}</h1>
        {user.bio && <p className="text-muted-foreground mt-2 max-w-lg">{user.bio}</p>}
      </div>

      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">Public recipes</h2>
        
        {recipes === undefined ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <RecipeCardSkeleton key={i} />)}
            </div>
        ) : recipes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg">
                This chef hasn’t published any recipes yet.
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {recipes.map((recipe) => (
                    <RecipeCard key={recipe._id} recipe={recipe} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
