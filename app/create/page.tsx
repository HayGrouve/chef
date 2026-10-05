"use client";

import { useState, useRef, useEffect, useId, Suspense } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
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
import { cn, hasFinePointer, pluralize } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// --- Form Sections ---

type SectionFormProps = { form: UseFormReturn<RecipeFormValues> };

function BasicsFields({ form }: SectionFormProps) {
  // Start in the title field, but only with a mouse: on phones it would pop the keyboard.
  useEffect(() => {
    if (hasFinePointer()) form.setFocus("title");
  }, [form]);

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
                placeholder="e.g., Spaghetti carbonara…"
                autoComplete="off"
                {...field}
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
                placeholder="A brief description of your dish…"
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
      <button
        type="button"
        className="group flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:bg-accent/50"
        onClick={() => fileInputRef.current?.click()}
        aria-label={imagePreview ? "Change photo" : undefined}
      >
        {imagePreview ? (
          <span className="relative block aspect-video w-full max-w-sm overflow-hidden rounded-md">
            <Image
              src={imagePreview}
              alt=""
              fill
              sizes="384px"
              className="object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="font-medium text-white">Change photo</span>
            </span>
          </span>
        ) : (
          <span className="block space-y-2 text-center text-muted-foreground">
            <Upload className="mx-auto h-10 w-10" />
            <span className="block">Choose a photo</span>
            <span className="block text-xs">PNG, JPG or WEBP, up to 5&nbsp;MB</span>
          </span>
        )}
      </button>
      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={onImageChange}
      />
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
              <FormLabel>Cooking time (min)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="30"
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
              <FormLabel>Calories per serving (kcal)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="500"
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
                      ? `${pluralize(field.value.length, "tag")} selected`
                      : "Select tags…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Search tags…" />
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
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mr-1 ml-0.5 h-5 w-5 rounded-full p-0 hover:bg-foreground/10"
                    aria-label={`Remove ${tag} tag`}
                    onClick={() => {
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
  /** Accessible name for the drag handle, e.g. "Reorder ingredient 3". */
  handleLabel: string;
  children: React.ReactNode;
}

function SortableRow({ id, handleLabel, children }: SortableRowProps) {
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
      className={cn("flex items-start gap-2", isDragging && "select-none opacity-50")}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={handleLabel}
        className="mt-4 rounded text-muted-foreground cursor-grab hover:text-foreground active:cursor-grabbing touch-none"
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
              <SortableRow
                key={field.id}
                id={field.id}
                handleLabel={`Reorder ${label.toLowerCase()} ${index + 1}`}
              >
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
                          aria-label={`${label} ${index + 1}`}
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
                  aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
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
    <nav aria-label="Form sections" className="sticky top-24 space-y-4">
      <div>
        <p className="text-sm font-medium">
          {done} of {required.length} required
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width]"
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

  // Load the recipe into the form once. Later live updates (a save from
  // another tab, background ingredient tagging) must not wipe unsaved edits.
  const loadedRecipeId = useRef<string | null>(null);
  useEffect(() => {
    if (existingRecipe && loadedRecipeId.current !== existingRecipe._id) {
      loadedRecipeId.current = existingRecipe._id;
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
          "Unsupported file type",
          "Choose a PNG, JPEG or WEBP image."
        );
        e.target.value = ""; // Reset input
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showAlert("File too large", "Choose an image smaller than 5\u00A0MB.");
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
        // Compression decodes the image, so failing here means the file isn't
        // a readable image (e.g. a renamed text file); don't upload it
        console.error("Image compression failed:", error);
        showAlert("Couldn’t read that image", "Choose a different PNG, JPEG or WEBP photo.");
        e.target.value = "";
      }
    }
  };

  const showAlert = (title: string, message: string) => {
    toast.error(title, { description: message });
  };

  const [extrasOpen, setExtrasOpen] = useState(false);
  const values = useWatch({ control: form.control });

  // Warn before throwing away edits: on reload/close, and on Cancel.
  const { isDirty, isSubmitSuccessful } = form.formState;
  const hasUnsavedChanges = (isDirty || imageFile !== null) && !isSubmitSuccessful;
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);
  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push(editId ? `/recipe/${editId}` : "/");
  };

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
      showAlert("Photo required", "Add a photo of the dish to save the recipe.");
      scrollToSection("section-photo");
      document
        .querySelector<HTMLElement>("#section-photo button")
        ?.focus({ preventScroll: true });
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

  const submitting = useRef(false);
  const onSubmit = async (data: RecipeFormValues) => {
    // Same-tick double clicks get past the isSubmitting state; this ref doesn't
    if (submitting.current) return;
    // Convex queues mutations while offline, which would leave "Saving…" hanging
    if (!navigator.onLine) {
      showAlert("You’re offline", "Reconnect to save. Your changes are still here.");
      return;
    }
    submitting.current = true;
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
        submitting.current = false;
        showAlert("Photo required", "Add a photo of the dish to save the recipe.");
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
      submitting.current = false;
      console.error("Failed to save recipe:", error);
      showAlert(
        "Couldn’t save the recipe",
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Check your connection and try again. Your changes are still here."
      );
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

  // Missing, private, or someone else's: there's nothing here you can edit
  if (editId && (!existingRecipe || !existingRecipe.isOwner)) {
    return (
      <div className="container mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Can’t edit this recipe</h1>
        <p className="mt-2 text-muted-foreground">
          It doesn’t exist, or it belongs to someone else.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={existingRecipe ? `/recipe/${editId}` : "/"}>
            <ArrowLeft /> {existingRecipe ? "Back to recipe" : "Back to Cook"}
          </Link>
        </Button>
      </div>
    );
  }

  const isSubmitting = form.formState.isSubmitting;

  const hasRows = (rows?: { value?: string }[]) =>
    !!rows?.some((r) => r.value?.trim());
  const extrasSummary = [
    values.cookingTime ? `${values.cookingTime}\u00A0min` : null,
    values.difficulty,
    values.calories ? `${values.calories}\u00A0kcal` : null,
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
    <div className="container mx-auto max-w-5xl px-4 pb-4 pt-6 md:pt-10">
      <title>{editId ? "CHEF | Edit Recipe" : "CHEF | Create Recipe"}</title>
      <meta name="description" content="Create a new recipe with CHEF" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          {editId ? "Edit recipe" : "New recipe"}
        </h1>
        {!editId && (
          <Button asChild variant="outline" size="sm">
            <Link href="/import">
              <Sparkles className="h-4 w-4" />
              Import from a link or photo
            </Link>
          </Button>
        )}
      </div>

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
                placeholder="e.g., 200g spaghetti…"
                label="Ingredient"
              />
            </FormSection>

            <FormSection meta={steps} index={3}>
              <ListSection
                form={form}
                name="steps"
                placeholder="e.g., Bring a large pot of salted water to a boil…"
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

            <div data-sticky-actions className="sticky bottom-16 md:bottom-0 z-10 -mx-4 px-4 py-3 border-t bg-background/95 backdrop-blur flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (hasUnsavedChanges ? setConfirmLeave(true) : leave())}
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
                  ? "Saving…"
                  : editId
                    ? "Save changes"
                    : "Create recipe"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {editId
                ? "Your edits to this recipe haven’t been saved."
                : "This recipe hasn’t been saved yet."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={leave}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
