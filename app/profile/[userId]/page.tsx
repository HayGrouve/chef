"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User as UserIcon, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { RecipeCard } from "@/components/RecipeCard";
import { RecipeCardSkeleton } from "@/components/RecipeCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
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
  if (user === null) return <div className="container mx-auto p-4">User not found</div>;

  const isOwnProfile = currentUser?.userId === userId;

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="ghost" className="pl-0" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>
        {isOwnProfile && (
            <Link href="/profile/edit">
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
            </Link>
        )}
      </div>

      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-4 relative">
            {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
            ) : (
                <UserIcon className="w-12 h-12 text-muted-foreground" />
            )}
        </div>
        <h1 className="text-3xl font-bold">{user.name}</h1>
        {user.bio && <p className="text-muted-foreground mt-2 max-w-lg">{user.bio}</p>}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold border-b pb-2">Public Recipes</h2>
        
        {recipes === undefined ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
            </div>
        ) : recipes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg">
                This chef hasn't published any recipes yet.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                    <RecipeCard key={recipe._id} recipe={recipe} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
