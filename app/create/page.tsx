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
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeSchema, RecipeFormValues } from "@/lib/validations";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import { compressImage } from "@/lib/image-utils";

// --- Sub-Components for Wizard Steps ---

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center mb-8 space-x-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i + 1 <= currentStep
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div
              className={`w-8 h-1 mx-2 transition-colors ${
                i + 1 < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface BasicDetailsStepProps {
  form: UseFormReturn<RecipeFormValues>;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tagInput: string;
  setTagInput: (value: string) => void;
  handleAddTag: (e: React.KeyboardEvent) => void;
  removeTag: (tag: string) => void;
}

function BasicDetailsStep({
  form,
  imagePreview,
  onImageChange,
  tagInput,
  setTagInput,
  handleAddTag,
  removeTag,
}: BasicDetailsStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tags = form.watch("tags") || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recipe Title *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Spaghetti Carbonara"
                {...field}
                autoFocus
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="cookingTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cooking Time (mins)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 30"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="calories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calories (kcal)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="A brief description of your dish..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <Label>Recipe Image *</Label>
        <div
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {imagePreview ? (
            <div className="relative w-full max-w-sm aspect-video rounded-md overflow-hidden">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-cover"
              />
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
            accept="image/png, image/jpeg, image/jpg, image/webp"
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
        <div className="flex flex-wrap gap-2 mt-2 min-h-8">
          {tags.map((tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-3 py-1 flex items-center gap-2"
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="h-auto w-auto p-0 ml-1 hover:text-destructive focus:text-destructive"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Make Public</FormLabel>
              <FormDescription>
                Anyone with the link can view this recipe.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

interface DynamicListStepProps {
  form: UseFormReturn<RecipeFormValues>;
  name: "ingredients" | "steps";
  title: string;
  placeholder: string;
  label: string;
}

function DynamicListStep({
  form,
  name,
  title,
  placeholder,
  label,
}: DynamicListStepProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: name,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      append({ value: "" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-semibold">{title} *</Label>
        <Button
          size="sm"
          onClick={() => append({ value: "" })}
          variant="outline"
          type="button"
        >
          <Plus className="w-4 h-4 mr-2" /> Add {label}
        </Button>
      </div>

      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
            No {label.toLowerCase()}s added yet.
          </div>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <span className="mt-3 text-sm font-medium text-muted-foreground w-6 text-center">
              {index + 1}.
            </span>
            <FormField
              control={form.control}
              name={`${name}.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={placeholder}
                      className="min-h-12 resize-y"
                      onKeyDown={handleKeyDown}
                      autoFocus={index === fields.length - 1 && !field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="mt-1 text-muted-foreground hover:text-destructive"
              type="button"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <FormMessage>{form.formState.errors[name]?.message}</FormMessage>
      {fields.length > 0 && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full border-2 border-dashed"
          onClick={() => append({ value: "" })}
          type="button"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Another {label}
        </Button>
      )}
    </div>
  );
}

function ReviewStep({
  form,
  imagePreview,
}: {
  form: UseFormReturn<RecipeFormValues>;
  imagePreview: string | null;
}) {
  const values = form.getValues();
  const ingredients = values.ingredients || [];
  const steps = values.steps || [];
  const tags = values.tags || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-4">
        <div className="aspect-video relative rounded-lg overflow-hidden bg-muted border">
          {imagePreview ? (
            <Image
              src={imagePreview}
              alt="Preview"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No Image Selected
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge variant={values.isPublic ? "default" : "secondary"}>
              {values.isPublic ? "Public" : "Private"}
            </Badge>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold">
            {values.title || "Untitled Recipe"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {values.description || "No description provided."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag: string) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pt-4 border-t">
        <div>
          <h3 className="font-semibold mb-2">
            Ingredients ({ingredients.filter((i) => i.value.trim()).length})
          </h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {ingredients
              .filter((i) => i.value.trim())
              .map((item, i) => (
                <li key={i}>{item.value}</li>
              ))}
            {ingredients.filter((i) => i.value.trim()).length === 0 && (
              <li className="text-muted-foreground">None</li>
            )}
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-2">
            Instructions ({steps.filter((i) => i.value.trim()).length})
          </h3>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            {steps
              .filter((i) => i.value.trim())
              .map((item, i) => (
                <li key={i}>{item.value}</li>
              ))}
            {steps.filter((i) => i.value.trim()).length === 0 && (
              <li className="text-muted-foreground">None</li>
            )}
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
  const existingRecipe = useQuery(
    api.recipes.get,
    editId ? { id: editId } : "skip"
  );

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const form = useForm<RecipeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recipeSchema) as any,
    defaultValues: {
      title: "",
      description: "",
      ingredients: [{ value: "" }],
      steps: [{ value: "" }],
      tags: [],
      isPublic: true,
      cookingTime: undefined,
      calories: undefined,
      difficulty: undefined,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (existingRecipe) {
      form.reset({
        title: existingRecipe.title,
        description: existingRecipe.description,
        ingredients: existingRecipe.ingredients.map((i) => ({ value: i })),
        steps: existingRecipe.steps.map((s) => ({ value: s })),
        tags: existingRecipe.tags || [],
        isPublic: existingRecipe.isPublic || false,
        cookingTime: existingRecipe.cookingTime,
        difficulty: existingRecipe.difficulty as
          | "Easy"
          | "Medium"
          | "Hard"
          | undefined,
        calories: existingRecipe.calories,
      });

      if (existingRecipe.imageUrl && existingRecipe.imageUrl !== imagePreview) {
        // We use a timeout to push this to the next tick, avoiding the synchronous setState warning
        setTimeout(() => setImagePreview(existingRecipe.imageUrl), 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecipe, form]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagInput.trim();
      const currentTags = form.getValues("tags") || [];
      if (newTag && !currentTags.includes(newTag)) {
        form.setValue("tags", [...currentTags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        showAlert("Invalid File Type", "Please upload a valid image file (PNG, JPEG, JPG, WEBP).");
        e.target.value = ""; // Reset input
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert("File Too Large", "Please upload an image smaller than 5MB.");
        e.target.value = ""; // Reset input
        return;
      }

      try {
        const compressed = await compressImage(file);
        setImageFile(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      } catch (error) {
        console.error("Image compression failed:", error);
        // Fallback to original file
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  const nextStep = async () => {
    let valid = false;
    if (currentStep === 1) {
      valid = await form.trigger([
        "title",
        "description",
        "cookingTime",
        "calories",
        "difficulty",
        "tags",
        "isPublic",
      ]);
      if (!imagePreview && !editId) {
        showAlert("Image Required", "Please upload an image for your recipe.");
        return;
      }
    } else if (currentStep === 2) {
      valid = await form.trigger("ingredients");
    } else if (currentStep === 3) {
      valid = await form.trigger("steps");
    } else {
      valid = true;
    }

    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const onSubmit = async (data: RecipeFormValues) => {
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
        return;
      }

      const cleanIngredients = data.ingredients
        .map((i) => i.value)
        .filter((i) => i.trim() !== "");
      const cleanSteps = data.steps
        .map((s) => s.value)
        .filter((s) => s.trim() !== "");

      const recipeData = {
        title: data.title,
        description: data.description,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        storageId: storageId!,
        format: "image",
        tags: data.tags,
        isPublic: data.isPublic,
        cookingTime: data.cookingTime,
        difficulty: data.difficulty,
        calories: data.calories,
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
    }
  };

  if (editId && existingRecipe === undefined) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-[50vh]">
        Loading recipe...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="pl-0"
          onClick={() => router.push("/")}
        >
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {currentStep === 1 && (
                <BasicDetailsStep
                  form={form}
                  imagePreview={imagePreview}
                  onImageChange={handleImageChange}
                  tagInput={tagInput}
                  setTagInput={setTagInput}
                  handleAddTag={handleAddTag}
                  removeTag={removeTag}
                />
              )}
              {currentStep === 2 && (
                <DynamicListStep
                  form={form}
                  name="ingredients"
                  title="Ingredients"
                  placeholder="e.g., 200g Spaghetti"
                  label="Ingredient"
                />
              )}
              {currentStep === 3 && (
                <DynamicListStep
                  form={form}
                  name="steps"
                  title="Instructions"
                  placeholder="e.g., Bring a large pot of salted water to a boil."
                  label="Step"
                />
              )}
              {currentStep === 4 && (
                <ReviewStep form={form} imagePreview={imagePreview} />
              )}
            </form>
          </Form>
        </CardContent>
        <div className="p-6 border-t bg-muted/10 flex justify-between mt-auto">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || form.formState.isSubmitting}
            className="w-32"
            type="button"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          {currentStep < 4 ? (
            <Button onClick={nextStep} className="w-32" type="button">
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting}
              className="w-32"
            >
              {form.formState.isSubmitting
                ? "Saving..."
                : editId
                  ? "Update"
                  : "Create"}
              {!form.formState.isSubmitting && (
                <CheckCircle2 className="w-4 h-4 ml-2" />
              )}
            </Button>
          )}
        </div>
      </Card>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertTitle}</DialogTitle>
            <DialogDescription>{alertMessage}</DialogDescription>
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
  );
}
