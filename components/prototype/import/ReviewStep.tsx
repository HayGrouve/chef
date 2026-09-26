"use client";

// PROTOTYPE — Smart Import: review and edit the draft, then save it.
import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { compressImage } from "@/lib/image-utils";
import { PREDEFINED_TAGS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FormSection, type SectionMeta } from "./FormSection";
import {
  errorMessage,
  hostname,
  newRow,
  type Difficulty,
  type EditableDraft,
  type Editor,
  type ImageState,
  type Row,
} from "./lib";

type Props = {
  editor: Editor;
  onChange: (editor: Editor) => void;
  onStartOver: () => void;
  onSaved: () => void;
};

export function ReviewStep({ editor, onChange, onStartOver, onSaved }: Props) {
  const router = useRouter();
  const save = useAction(api.prototype.importRecipe.save);
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);

  const { result, form, image } = editor;
  const { draft } = result;
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const setForm = (patch: Partial<EditableDraft>) => onChange({ ...editor, form: { ...form, ...patch } });
  const setImage = (next: ImageState) => onChange({ ...editor, image: next });

  const filled = (rows: Row[]) => rows.some((r) => r.value.trim());
  const errors = {
    title: !form.title.trim() ? "Give the recipe a title." : null,
    ingredients: !filled(form.ingredients) ? "Add at least one ingredient." : null,
    steps: !filled(form.steps) ? "Add at least one step." : null,
  };

  const sections: Record<string, SectionMeta> = {
    basics: {
      id: "section-basics",
      title: "Basics",
      description: "The name and a sentence or two about the dish.",
      status: errors.title ? "todo" : "done",
    },
    photo: {
      id: "section-photo",
      title: "Photo",
      description: "Optional, but it helps the recipe stand out.",
      status: image.kind === "none" ? "optional" : "done",
    },
    ingredients: {
      id: "section-ingredients",
      title: "Ingredients",
      description: "One per line, with amounts.",
      status: errors.ingredients ? "todo" : "done",
    },
    steps: {
      id: "section-steps",
      title: "Steps",
      description: "One per line, in order.",
      status: errors.steps ? "todo" : "done",
    },
    extras: {
      id: "section-extras",
      title: "Extras",
      description: "Time, difficulty, calories, tags and who can see it.",
      status: "optional",
    },
  };

  const required = [sections.basics, sections.ingredients, sections.steps];
  const doneCount = required.filter((s) => s.status === "done").length;

  const extrasSummary = [
    form.cookingTime ? `${form.cookingTime} min` : null,
    form.difficulty || null,
    form.calories ? `${form.calories} kcal` : null,
    form.tags.length ? `${form.tags.length} tag${form.tags.length > 1 ? "s" : ""}` : null,
    form.isPublic ? "Public" : "Private",
  ]
    .filter(Boolean)
    .join(" · ");

  const handleSave = async () => {
    const firstError = errors.title
      ? sections.basics.id
      : errors.ingredients
        ? sections.ingredients.id
        : errors.steps
          ? sections.steps.id
          : null;
    if (firstError) {
      setShowErrors(true);
      document.getElementById(firstError)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setSaving(true);
    try {
      let imageStorageId: Id<"_storage"> | undefined;
      let imageUrl: string | undefined;
      if (image.kind === "stored") imageStorageId = image.storageId;
      if (image.kind === "remote") imageUrl = image.url;
      if (image.kind === "file") imageStorageId = await uploadImage(image.file, generateUploadUrl);

      const toNumber = (s: string) => {
        const n = Number(s);
        return s.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
      };

      const { recipeId, imageSaved } = await save({
        title: form.title.trim(),
        description: form.description.trim(),
        ingredients: form.ingredients.map((r) => r.value.trim()).filter(Boolean),
        steps: form.steps.map((r) => r.value.trim()).filter(Boolean),
        cookingTime: toNumber(form.cookingTime),
        calories: toNumber(form.calories),
        difficulty: form.difficulty || undefined,
        tags: form.tags,
        isPublic: form.isPublic,
        imageUrl,
        imageStorageId,
      });

      onSaved();
      const href = `/recipe/${recipeId}`;
      toast.success("Saved to your cookbook", {
        description:
          image.kind !== "none" && !imageSaved
            ? "The photo couldn't be copied from the site. You can add one by editing the recipe."
            : undefined,
        action: { label: "View", onClick: () => router.push(href) },
      });
      router.push(href);
    } catch (error) {
      toast.error("Couldn't save the recipe", { description: errorMessage(error) });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProvenanceBanner editor={editor} />

      <FormSection meta={sections.basics} index={0}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-title">Title</Label>
            <Input
              id="import-title"
              value={form.title}
              onChange={(e) => setForm({ title: e.target.value })}
              aria-invalid={showErrors && !!errors.title}
            />
            {showErrors && errors.title && <FieldError>{errors.title}</FieldError>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-description">Description</Label>
            <Textarea
              id="import-description"
              value={form.description}
              onChange={(e) => setForm({ description: e.target.value })}
              placeholder="A sentence or two about the dish"
            />
          </div>
        </div>
      </FormSection>

      <FormSection meta={sections.photo} index={1}>
        <PhotoEditor
          image={image}
          onImageChange={setImage}
          sourcePhoto={result.sourcePhoto}
        />
      </FormSection>

      <FormSection meta={sections.ingredients} index={2}>
        {draft.servings ? (
          <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Serves {draft.servings} (from the source). Servings aren&apos;t saved with recipes yet.
          </p>
        ) : null}
        <ListEditor
          rows={form.ingredients}
          onRowsChange={(ingredients) => setForm({ ingredients })}
          placeholder="e.g., 200g spaghetti"
          noun="ingredient"
        />
        {showErrors && errors.ingredients && <FieldError>{errors.ingredients}</FieldError>}
      </FormSection>

      <FormSection meta={sections.steps} index={3}>
        <ListEditor
          rows={form.steps}
          onRowsChange={(steps) => setForm({ steps })}
          placeholder="e.g., Bring a large pot of salted water to the boil."
          noun="step"
          multiline
        />
        {showErrors && errors.steps && <FieldError>{errors.steps}</FieldError>}
      </FormSection>

      <FormSection
        meta={sections.extras}
        index={4}
        collapsible={{ open: extrasOpen, onOpenChange: setExtrasOpen, summary: extrasSummary }}
      >
        <ExtrasEditor form={form} setForm={setForm} />
      </FormSection>

      <div className="sticky bottom-16 z-10 -mx-4 flex items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:bottom-0">
        <Button type="button" variant="ghost" onClick={onStartOver} disabled={saving}>
          <RotateCcw className="h-4 w-4" /> Start over
        </Button>
        <span className="ml-auto hidden text-sm text-muted-foreground sm:inline">
          {doneCount === required.length ? "Ready to save" : `${doneCount} of ${required.length} required`}
        </span>
        <Button type="button" onClick={handleSave} disabled={saving} className="ml-auto min-w-40 sm:ml-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {saving ? "Saving…" : "Save to cookbook"}
        </Button>
      </div>
    </div>
  );
}

async function uploadImage(
  file: File,
  generateUploadUrl: () => Promise<string>
): Promise<Id<"_storage">> {
  const compressed = await compressImage(file).catch(() => file);
  const postUrl = await generateUploadUrl();
  const response = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": compressed.type },
    body: compressed,
  });
  if (!response.ok) throw new Error("Upload failed");
  const { storageId } = await response.json();
  return storageId as Id<"_storage">;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-destructive">{children}</p>;
}

// --- Provenance ----------------------------------------------------------------

function ProvenanceBanner({ editor }: { editor: Editor }) {
  const { draft, kind, contextUrl } = editor.result;
  const exact = draft.method === "structured-data";
  const source = draft.sourceUrl ?? contextUrl;
  const origin =
    kind === "photo" ? "From your photo" : kind === "text" ? "From pasted text" : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        exact ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-medium",
            exact ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400" : "border-primary/40 text-primary"
          )}
        >
          {exact ? <BadgeCheck className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {exact ? "Read from the page's recipe data" : "Extracted by AI"}
        </Badge>
        {origin && <span className="text-muted-foreground">{origin}</span>}
        {source && (
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <span className="truncate">{hostname(source)}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">
        {exact
          ? "Copied as the site publishes it. Check it over and save."
          : "Double-check quantities and steps before saving."}
      </p>
      {draft.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
          {draft.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Photo -------------------------------------------------------------------

function PhotoEditor({
  image,
  onImageChange,
  sourcePhoto,
}: {
  image: ImageState;
  onImageChange: (image: ImageState) => void;
  sourcePhoto?: { storageId: Id<"_storage">; previewUrl: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  const previewUrl =
    image.kind === "remote" ? image.url : image.kind === "none" ? null : image.previewUrl;

  const remove = () => {
    const previous = image;
    onImageChange({ kind: "none" });
    toast("Photo removed", { action: { label: "Undo", onClick: () => onImageChange(previous) } });
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!file.type.startsWith("image/")) {
            toast.error("That isn't an image.");
            return;
          }
          onImageChange({ kind: "file", file, previewUrl: URL.createObjectURL(file) });
        }}
      />

      {previewUrl ? (
        <div className="space-y-2">
          <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
            {brokenUrl === previewUrl ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center text-sm text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
                {image.kind === "remote"
                  ? "The site's photo can't be previewed here. We'll still try to copy it when you save."
                  : "Preview unavailable, but the photo will still be saved."}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts / blob previews
              <img
                src={previewUrl}
                alt="Recipe"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={() => setBrokenUrl(previewUrl)}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={remove}
            >
              <Trash2 className="h-4 w-4" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full max-w-md flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-8 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
        >
          <Camera className="h-7 w-7" />
          <span className="font-medium text-foreground">Add a photo</span>
          <span className="text-xs">You can also save without one</span>
        </button>
      )}

      {sourcePhoto && (
        <div className="flex max-w-md items-center justify-between gap-3 rounded-lg border p-3">
          <Label htmlFor="use-source-photo" className="font-normal">
            Use this photo as the recipe image
          </Label>
          <Switch
            id="use-source-photo"
            checked={image.kind === "stored"}
            onCheckedChange={(on) => onImageChange(on ? { kind: "stored", ...sourcePhoto } : { kind: "none" })}
          />
        </div>
      )}
    </div>
  );
}

// --- Lists -------------------------------------------------------------------

function ListEditor({
  rows,
  onRowsChange,
  placeholder,
  noun,
  multiline,
}: {
  rows: Row[];
  onRowsChange: (rows: Row[]) => void;
  placeholder: string;
  noun: string;
  multiline?: boolean;
}) {
  const refs = useRef(new Map<number, HTMLTextAreaElement | HTMLInputElement>());
  const focus = (id: number) => requestAnimationFrame(() => refs.current.get(id)?.focus());

  const update = (id: number, value: string) =>
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, value } : r)));

  const insertAfter = (index: number, values: string[] = [""]) => {
    const added = values.map((v) => newRow(v));
    onRowsChange([...rows.slice(0, index + 1), ...added, ...rows.slice(index + 1)]);
    focus(added[added.length - 1].id);
  };

  const remove = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onRowsChange(next.length ? next : [newRow()]);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number, row: Row) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      insertAfter(index);
    } else if (e.key === "Backspace" && row.value === "" && rows.length > 1) {
      e.preventDefault();
      remove(index);
      focus(rows[index > 0 ? index - 1 : 1].id);
    }
  };

  // Pasting several lines fills several rows
  const onPaste = (e: React.ClipboardEvent, index: number, row: Row) => {
    const lines = e.clipboardData
      .getData("text")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const [first, ...rest] = lines;
    const withFirst = rows.map((r) => (r.id === row.id ? { ...r, value: (r.value + " " + first).trim() } : r));
    const added = rest.map((v) => newRow(v));
    onRowsChange([...withFirst.slice(0, index + 1), ...added, ...withFirst.slice(index + 1)]);
  };

  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const shared = {
          value: row.value,
          placeholder,
          "aria-label": `${noun} ${index + 1}`,
          onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => update(row.id, e.target.value),
          onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, index, row),
          onPaste: (e: React.ClipboardEvent) => onPaste(e, index, row),
        };
        return (
          <div key={row.id} className="group flex items-start gap-2">
            <span className="mt-2 w-6 shrink-0 text-right text-sm font-medium text-muted-foreground">
              {index + 1}.
            </span>
            {multiline ? (
              <Textarea
                {...shared}
                ref={(el) => {
                  if (el) refs.current.set(row.id, el);
                  else refs.current.delete(row.id);
                }}
                className="min-h-10 flex-1 resize-none"
              />
            ) : (
              <Input
                {...shared}
                ref={(el) => {
                  if (el) refs.current.set(row.id, el);
                  else refs.current.delete(row.id);
                }}
                className="flex-1"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${noun} ${index + 1}`}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-full border border-dashed text-muted-foreground"
        onClick={() => insertAfter(rows.length - 1)}
      >
        <Plus className="h-4 w-4" /> Add {noun}
      </Button>
    </div>
  );
}

// --- Extras ------------------------------------------------------------------

function ExtrasEditor({
  form,
  setForm,
}: {
  form: EditableDraft;
  setForm: (patch: Partial<EditableDraft>) => void;
}) {
  const toggleTag = (tag: string) =>
    setForm({ tags: form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag] });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="import-time">Time (min)</Label>
          <Input
            id="import-time"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.cookingTime}
            onChange={(e) => setForm({ cookingTime: e.target.value })}
            placeholder="e.g., 30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="import-calories">Calories (kcal)</Label>
          <Input
            id="import-calories"
            type="number"
            inputMode="numeric"
            min={0}
            value={form.calories}
            onChange={(e) => setForm({ calories: e.target.value })}
            placeholder="e.g., 500"
          />
        </div>
        <div className="col-span-2 space-y-2 md:col-span-1">
          <Label>Difficulty</Label>
          <Select
            value={form.difficulty || undefined}
            onValueChange={(v) => setForm({ difficulty: v as Difficulty })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {PREDEFINED_TAGS.map((tag) => {
            const on = form.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <Label htmlFor="import-public">Make public</Label>
          <p className="text-xs text-muted-foreground">Anyone with the link can view it. Imports start private.</p>
        </div>
        <Switch id="import-public" checked={form.isPublic} onCheckedChange={(isPublic) => setForm({ isPublic })} />
      </div>
    </div>
  );
}
