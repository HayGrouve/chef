"use client";

import { useState, useRef, useEffect, useId, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Check,
  Loader2,
  ChevronDown,
  ChevronsUpDown,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { toast } from "sonner";
import { useForm, useFieldArray, useWatch, UseFormReturn } from "react-hook-form";
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
import { PREDEFINED_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// --- Form Sections ---

type SectionFormProps = { form: UseFormReturn<RecipeFormValues> };

function BasicsFields({ form }: SectionFormProps) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
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

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
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

    </div>
  );
}

function PhotoField({
  imagePreview,
  onImageChange,
}: {
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
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
            <p className="text-xs">PNG, JPG or WEBP, up to 5MB</p>
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
  );
}

function ExtrasFields({ form }: SectionFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
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
        name="tags"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Tags</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {field.value && field.value.length > 0
                      ? `${field.value.length} tags selected`
                      : "Select tags..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList>
                    <CommandEmpty>No tag found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {PREDEFINED_TAGS.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => {
                            const currentTags = field.value || [];
                            const newTags = currentTags.includes(tag)
                              ? currentTags.filter((t) => t !== tag)
                              : [...currentTags, tag];
                            field.onChange(newTags);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value?.includes(tag)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="flex flex-wrap gap-2 mt-2">
              {field.value?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent form submit
                      const newTags = field.value?.filter((t) => t !== tag);
                      field.onChange(newTags);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Make public</FormLabel>
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

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
}

function SortableRow({ id, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: isDragging ? ("relative" as const) : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-start gap-2", isDragging && "opacity-50")}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-4 text-muted-foreground cursor-grab hover:text-foreground active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

interface ListSectionProps {
  form: UseFormReturn<RecipeFormValues>;
  name: "ingredients" | "steps";
  placeholder: string;
  label: string;
}

function ListSection({
  form,
  name,
  placeholder,
  label,
}: ListSectionProps) {
  // Stable id so dnd-kit's aria ids match between server and client render
  const dndId = useId();
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: name,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      append({ value: "" });
    }
  };

  return (
    <div className="space-y-3">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={fields} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                No {label.toLowerCase()}s added yet.
              </div>
            )}
            {fields.map((field, index) => (
              <SortableRow key={field.id} id={field.id}>
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
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <FormMessage>{form.formState.errors[name]?.message}</FormMessage>
      <Button
        size="sm"
        variant="ghost"
        className="w-full border border-dashed text-muted-foreground"
        onClick={() => append({ value: "" })}
        type="button"
      >
        <Plus className="w-4 h-4 mr-2" /> Add {label.toLowerCase()}
      </Button>
      <p className="text-xs text-muted-foreground">
        Press Enter to add the next {label.toLowerCase()}. Drag the handle to reorder.
      </p>
    </div>
  );
}

// --- Section shell & progress nav ---

type SectionStatus = "done" | "todo" | "optional";

interface SectionMeta {
  id: string;
  title: string;
  description: string;
  status: SectionStatus;
}

function StatusBadge({ index, status }: { index: number; status: SectionStatus }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
        status === "done" && "bg-primary text-primary-foreground",
        status === "todo" && "border-2 border-muted-foreground/30 text-muted-foreground",
        status === "optional" && "border-2 border-dashed border-muted-foreground/30 text-muted-foreground"
      )}
    >
      {status === "done" ? <Check className="h-4 w-4" /> : index + 1}
    </span>
  );
}

function FormSection({
  meta,
  index,
  children,
  collapsible,
}: {
  meta: SectionMeta;
  index: number;
  children: React.ReactNode;
  collapsible?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    summary: string;
  };
}) {
  const header = (
    <div className="flex items-start gap-3">
      <StatusBadge index={index} status={meta.status} />
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold leading-7">
          {meta.title}
          {meta.status === "optional" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Optional
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {collapsible && !collapsible.open ? collapsible.summary : meta.description}
        </p>
      </div>
      {collapsible && (
        <ChevronDown
          className={cn(
            "mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            collapsible.open && "rotate-180"
          )}
        />
      )}
    </div>
  );

  return (
    <section
      id={meta.id}
      className="scroll-mt-24 rounded-xl border bg-card shadow-xs"
    >
      {collapsible ? (
        <Collapsible open={collapsible.open} onOpenChange={collapsible.onOpenChange}>
          <CollapsibleTrigger asChild>
            <button type="button" className="w-full p-4 md:p-6 text-left">
              {header}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 md:px-6 md:pb-6 md:pl-16">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <div className="p-4 md:p-6 pb-4 md:pb-4">{header}</div>
          <div className="px-4 pb-4 md:px-6 md:pb-6 md:pl-16">{children}</div>
        </>
      )}
    </section>
  );
}

function SectionNav({
  sections,
  onJump,
}: {
  sections: SectionMeta[];
  onJump: (id: string) => void;
}) {
  const required = sections.filter((s) => s.status !== "optional");
  const done = required.filter((s) => s.status === "done").length;

  return (
    <nav className="sticky top-24 space-y-4">
      <div>
        <p className="text-sm font-medium">
          {done} of {required.length} required
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(done / required.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="space-y-1">
        {sections.map((section, i) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onJump(section.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted"
            >
              <StatusBadge index={i} status={section.status} />
              <span
                className={cn(
                  section.status === "done" ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {section.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    mode: "onTouched",
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        showAlert(
          "Invalid File Type",
          "Please upload a valid image file (PNG, JPEG, JPG, WEBP)."
        );
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
    toast.error(title, { description: message });
  };

  const [extrasOpen, setExtrasOpen] = useState(false);
  const values = useWatch({ control: form.control });

  const scrollToSection = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Blank rows (e.g. left behind by pressing Enter) shouldn't block saving
  const pruneEmptyRows = () => {
    (["ingredients", "steps"] as const).forEach((name) => {
      const rows = form.getValues(name) ?? [];
      const filled = rows.filter((r) => r.value.trim() !== "");
      if (filled.length !== rows.length) {
        form.setValue(name, filled.length > 0 ? filled : [{ value: "" }]);
      }
    });
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    pruneEmptyRows();
    if (!imagePreview && !editId) {
      showAlert("Image Required", "Please upload an image for your recipe.");
      scrollToSection("section-photo");
      // Still validate so all other errors are shown at once
      form.trigger();
      return;
    }
    form.handleSubmit(onSubmit, (errors) => {
      // Extras is collapsible; open it if the problem is in there
      if (errors.cookingTime || errors.calories || errors.difficulty || errors.tags) {
        setExtrasOpen(true);
      }
      toast.error("Please fix the highlighted fields.");
    })();
  };

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
      <div className="container mx-auto p-4 max-w-3xl space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="aspect-video w-full max-w-sm" />
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  const hasRows = (rows?: { value?: string }[]) =>
    !!rows?.some((r) => r.value?.trim());
  const extrasSummary = [
    values.cookingTime ? `${values.cookingTime} min` : null,
    values.difficulty,
    values.calories ? `${values.calories} kcal` : null,
    values.tags?.length
      ? `${values.tags.length} tag${values.tags.length > 1 ? "s" : ""}`
      : null,
    values.isPublic ? "Public" : "Private",
  ]
    .filter(Boolean)
    .join(" · ");

  const sections: SectionMeta[] = [
    {
      id: "section-basics",
      title: "Basics",
      description: "Name your dish and describe it in a sentence or two.",
      status:
        (values.title?.trim().length ?? 0) >= 2 &&
        (values.description?.trim().length ?? 0) >= 10
          ? "done"
          : "todo",
    },
    {
      id: "section-photo",
      title: "Photo",
      description: "A photo helps your recipe stand out.",
      status: imagePreview ? "done" : "todo",
    },
    {
      id: "section-ingredients",
      title: "Ingredients",
      description: "One ingredient per line, with amounts.",
      status: hasRows(values.ingredients) ? "done" : "todo",
    },
    {
      id: "section-steps",
      title: "Instructions",
      description: "One step per line, in order.",
      status: hasRows(values.steps) ? "done" : "todo",
    },
    {
      id: "section-extras",
      title: "Extras",
      description: "Cooking time, calories, difficulty, tags and visibility.",
      status: "optional",
    },
  ];
  const [basics, photo, ingredients, steps, extras] = sections;

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <title>{editId ? "CHEF | Edit Recipe" : "CHEF | Create Recipe"}</title>
      <meta name="description" content="Create a new recipe with CHEF" />

      <h1 className="text-2xl font-bold mb-6">
        {editId ? "Edit recipe" : "New recipe"}
      </h1>

      <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
        <aside className="hidden lg:block">
          <SectionNav sections={sections} onJump={scrollToSection} />
        </aside>

        <Form {...form}>
          <form onSubmit={handleSave} className="min-w-0 space-y-4">
            <FormSection meta={basics} index={0}>
              <BasicsFields form={form} />
            </FormSection>

            <FormSection meta={photo} index={1}>
              <PhotoField
                imagePreview={imagePreview}
                onImageChange={handleImageChange}
              />
            </FormSection>

            <FormSection meta={ingredients} index={2}>
              <ListSection
                form={form}
                name="ingredients"
                placeholder="e.g., 200g Spaghetti"
                label="Ingredient"
              />
            </FormSection>

            <FormSection meta={steps} index={3}>
              <ListSection
                form={form}
                name="steps"
                placeholder="e.g., Bring a large pot of salted water to a boil."
                label="Step"
              />
            </FormSection>

            <FormSection
              meta={extras}
              index={4}
              collapsible={{
                open: extrasOpen,
                onOpenChange: setExtrasOpen,
                summary: extrasSummary,
              }}
            >
              <ExtrasFields form={form} />
            </FormSection>

            <div className="sticky bottom-16 md:bottom-0 z-10 -mx-4 px-4 py-3 border-t bg-background/95 backdrop-blur flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-32">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {isSubmitting
                  ? "Saving..."
                  : editId
                    ? "Save changes"
                    : "Create recipe"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function CreateRecipe() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-4 max-w-3xl space-y-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      }
    >
      <CreateRecipeContent />
    </Suspense>
  );
}
