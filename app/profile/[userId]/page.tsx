"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User as UserIcon, Edit } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

function RecipeImage({
  imageUrl,
  title,
}: {
  imageUrl: string | null;
  title: string;
}) {
  if (!imageUrl) {
    return (
      <div className="aspect-video bg-muted rounded-md flex items-center justify-center overflow-hidden">
        <span className="text-muted-foreground">No Image</span>
      </div>
    );
  }

  return (
    <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
      <Image
        src={imageUrl}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const user = useQuery(api.users.get, { userId });
  const currentUser = useQuery(api.users.getMe);
  
  // We need a query to list PUBLIC recipes by a specific user. 
  // Currently `api.recipes.list` lists recipes for the logged in user.
  // Let's create a new query or modify list.
  // Since I can't easily modify recipes.ts right this second without context switching tasks too much, 
  // I'll note that we need `api.recipes.listPublicByUser`.
  // Wait, I can modify recipes.ts. I'll do that next.
  // For now, let's assume we have `api.recipes.listPublic` which takes a userId.
  const recipes = useQuery(api.recipes.listPublic, { userId });

  if (user === undefined) return <div className="container mx-auto p-4">Loading...</div>;
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
            <div className="py-8 text-center">Loading recipes...</div>
        ) : recipes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground bg-muted/30 rounded-lg">
                This chef hasn't published any recipes yet.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                    <Link href={`/recipe/${recipe._id}`} key={recipe._id}>
                        <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{recipe.title}</CardTitle>
                                <CardDescription className="line-clamp-2">{recipe.description}</CardDescription>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {recipe.tags?.slice(0, 3).map(tag => (
                                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">{tag}</Badge>
                                    ))}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <RecipeImage
                                    imageUrl={recipe.imageUrl}
                                    title={recipe.title}
                                />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
