"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Id } from "../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Upload, Plus, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

// --- Sub-Components for Wizard Steps ---

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
    return (
        <div className="flex items-center justify-center mb-8 space-x-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        i + 1 <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                        {i + 1}
                    </div>
                    {i < totalSteps - 1 && (
                        <div className={`w-8 h-1 mx-2 transition-colors ${
                            i + 1 < currentStep ? "bg-primary" : "bg-muted"
                        }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

function BasicDetailsStep({ 
    title, setTitle, 
    description, setDescription, 
    imagePreview, onImageChange, 
    tags, tagInput, setTagInput, handleAddTag, removeTag,
    isPublic, setIsPublic 
}: any) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
                <Label htmlFor="title">Recipe Title</Label>
                <Input 
                    id="title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g., Spaghetti Carbonara"
                    autoFocus
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                    id="description" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="A brief description of your dish..."
                />
            </div>

            <div className="space-y-2">
                <Label>Recipe Image</Label>
                <div 
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {imagePreview ? (
                        <div className="relative w-full max-w-sm aspect-video rounded-md overflow-hidden">
                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-white font-medium">Change Image</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-2 text-muted-foreground">
                            <Upload className="w-10 h-10 mx-auto" />
                            <p>Click to upload an image</p>
                        </div>
                    )}
                    <Input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={onImageChange}
                    />
                </div>
            </div>

             <div className="space-y-2">
              <Label htmlFor="tags">Tags (Press Enter to add)</Label>
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Dinner, Italian, Healthy..."
              />
              <div className="flex flex-wrap gap-2 mt-2 min-h-[2rem]">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="px-2 py-1">
                    {tag}
                    <X 
                      className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                />
                <div className="flex-1">
                    <Label htmlFor="public" className="cursor-pointer">Make Public</Label>
                    <p className="text-xs text-muted-foreground">Anyone with the link can view this recipe.</p>
                </div>
            </div>
        </div>
    );
}

function DynamicListStep({ title, items, setItems, placeholder, label }: any) {
    const addItem = () => setItems([...items, ""]);
    
    const updateItem = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_: any, i: number) => i !== index));
    };

    return (
         <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">{title}</Label>
                <Button size="sm" onClick={addItem} variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Add {label}
                </Button>
            </div>
            
            <div className="space-y-3">
                {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                        No {label.toLowerCase()}s added yet.
                    </div>
                )}
                {items.map((item: string, index: number) => (
                    <div key={index} className="flex gap-2 items-start">
                        <span className="mt-3 text-sm font-medium text-muted-foreground w-6 text-center">{index + 1}.</span>
                        <Textarea 
                            value={item}
                            onChange={(e) => updateItem(index, e.target.value)}
                            placeholder={placeholder}
                            className="flex-1 min-h-[3rem] resize-y"
                            autoFocus={index === items.length - 1 && item === ""}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="mt-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
            {items.length > 0 && (
                <Button size="sm" variant="ghost" className="w-full border-2 border-dashed" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-2" /> Add Another {label}
                </Button>
            )}
        </div>
    );
}

function ReviewStep({ title, description, ingredients, steps, imagePreview, tags, isPublic }: any) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
                <div className="aspect-video relative rounded-lg overflow-hidden bg-muted border">
                     {imagePreview ? (
                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground">No Image Selected</div>
                    )}
                    <div className="absolute top-2 right-2">
                         <Badge variant={isPublic ? "default" : "secondary"}>
                             {isPublic ? "Public" : "Private"}
                         </Badge>
                    </div>
                </div>
                
                <div>
                    <h2 className="text-2xl font-bold">{title || "Untitled Recipe"}</h2>
                    <p className="text-muted-foreground mt-2">{description || "No description provided."}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-4 border-t">
                <div>
                    <h3 className="font-semibold mb-2">Ingredients ({ingredients.filter((i:string) => i.trim()).length})</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {ingredients.filter((i:string) => i.trim()).map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                        ))}
                        {ingredients.filter((i:string) => i.trim()).length === 0 && <li className="text-muted-foreground">None</li>}
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Instructions ({steps.filter((i:string) => i.trim()).length})</h3>
                     <ol className="list-decimal pl-5 space-y-1 text-sm">
                        {steps.filter((i:string) => i.trim()).map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                        ))}
                         {steps.filter((i:string) => i.trim()).length === 0 && <li className="text-muted-foreground">None</li>}
                    </ol>
                </div>
            </div>
        </div>
    );
}

// --- Main Component ---

function CreateRecipeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") as Id<"recipes"> | null;

  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);
  const createRecipe = useMutation(api.recipes.create);
  const updateRecipe = useMutation(api.recipes.update);
  const existingRecipe = useQuery(api.recipes.get, editId ? { id: editId } : "skip");

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title);
      setDescription(existingRecipe.description);
      setIngredients(existingRecipe.ingredients.length ? existingRecipe.ingredients : [""]);
      setSteps(existingRecipe.steps.length ? existingRecipe.steps : [""]);
      setTags(existingRecipe.tags || []);
      setIsPublic(existingRecipe.isPublic || false);
      setImagePreview(existingRecipe.imageUrl);
    }
  }, [existingRecipe]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const showAlert = (title: string, message: string) => {
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertOpen(true);
  };

  const validateStep = () => {
      if (currentStep === 1) {
          if (!title.trim()) {
              showAlert("Title Required", "Please give your recipe a title.");
              return false;
          }
          if (!imagePreview && !editId) { // Simplified check, ideally check if storageId exists or new file
               showAlert("Image Required", "Please upload an image for your recipe.");
               return false;
          }
      }
      return true;
  };

  const nextStep = () => {
      if (validateStep()) {
          setCurrentStep(prev => Math.min(prev + 1, 4));
      }
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      let storageId = existingRecipe?.storageId;

      if (imageFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        const json = await result.json();
        storageId = json.storageId;
      }

      if (!storageId && !editId) {
        showAlert("Missing Image", "Please select an image for the recipe.");
        setIsSubmitting(false);
        return;
      }

      const cleanIngredients = ingredients.filter(i => i.trim() !== "");
      const cleanSteps = steps.filter(s => s.trim() !== "");

      const recipeData = {
        title,
        description,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        storageId: storageId!, 
        format: "image",
        tags,
        isPublic,
      };

      if (editId) {
        await updateRecipe({
          id: editId,
          ...recipeData,
          storageId: imageFile ? storageId : undefined,
        });
      } else {
        await createRecipe(recipeData);
      }

      router.push("/");
    } catch (error) {
      console.error("Failed to save recipe:", error);
      showAlert("Error", "Failed to save recipe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (editId && existingRecipe === undefined) {
    return <div className="container mx-auto p-4 flex items-center justify-center h-[50vh]">Loading recipe...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
          <Button variant="ghost" className="pl-0" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel & Exit
          </Button>
      </div>

      <Card className="min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {editId ? "Edit Recipe" : "Create New Recipe"}
          </CardTitle>
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto px-4 md:px-8 py-2">
            {currentStep === 1 && (
                <BasicDetailsStep 
                    title={title} setTitle={setTitle}
                    description={description} setDescription={setDescription}
                    imagePreview={imagePreview} onImageChange={handleImageChange}
                    tags={tags} tagInput={tagInput} setTagInput={setTagInput} handleAddTag={handleAddTag} removeTag={removeTag}
                    isPublic={isPublic} setIsPublic={setIsPublic}
                />
            )}
            {currentStep === 2 && (
                <DynamicListStep 
                    title="Ingredients" 
                    items={ingredients} 
                    setItems={setIngredients} 
                    placeholder="e.g., 200g Spaghetti"
                    label="Ingredient"
                />
            )}
            {currentStep === 3 && (
                <DynamicListStep 
                    title="Instructions" 
                    items={steps} 
                    setItems={setSteps} 
                    placeholder="e.g., Bring a large pot of salted water to a boil."
                    label="Step"
                />
            )}
            {currentStep === 4 && (
                <ReviewStep 
                    title={title}
                    description={description}
                    ingredients={ingredients}
                    steps={steps}
                    imagePreview={imagePreview}
                    tags={tags}
                    isPublic={isPublic}
                />
            )}
        </CardContent>
        <div className="p-6 border-t bg-muted/10 flex justify-between mt-auto">
            <Button 
                variant="outline" 
                onClick={prevStep} 
                disabled={currentStep === 1 || isSubmitting}
                className="w-32"
            >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            {currentStep < 4 ? (
                <Button onClick={nextStep} className="w-32">
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-32">
                    {isSubmitting ? "Saving..." : (editId ? "Update" : "Create")}
                    {!isSubmitting && <CheckCircle2 className="w-4 h-4 ml-2" />}
                </Button>
            )}
        </div>
      </Card>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertTitle}</DialogTitle>
            <DialogDescription>
              {alertMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAlertOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreateRecipe() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CreateRecipeContent />
        </Suspense>
    )
}
