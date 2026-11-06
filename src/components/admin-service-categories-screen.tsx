"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Pencil, Plus, RefreshCw, Tags, Trash2, X } from "lucide-react";
import { apiRequest } from "@/components/api-client";
import { Alert, Button, Card, EmptyState, LoadingBlock, PageHeading, StatusBadge } from "@/components/ui";

type ServiceCategory = {
  _id: string;
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
  image: string;
  isActive: boolean;
};

type CategoryForm = Pick<ServiceCategory, "name" | "slug" | "description" | "displayOrder" | "image">;
const emptyForm: CategoryForm = { name: "", slug: "", description: "", displayOrder: 0, image: "" };

export function AdminServiceCategoriesScreen() {
  const [items, setItems] = useState<ServiceCategory[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<{ items: ServiceCategory[] }>("/api/admin/service-categories")
      .then(({ items: categories }) => {
        if (active) setItems(categories || []);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load service categories.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [reload]);

  function slugify(value: string) {
    return value.trim().toLowerCase().normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
  }

  function startCreating() {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function startEditing(category: ServiceCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      displayOrder: category.displayOrder || 0,
      image: category.image || "",
    });
    setSlugTouched(true);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { slug, ...details } = form;
      await apiRequest(editing
        ? `/api/admin/service-categories/${encodeURIComponent(editing.slug)}`
        : "/api/admin/service-categories", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ ...details, slug }),
      });
      setNotice(editing ? "Service updated." : "Service added.");
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setSlugTouched(false);
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this category.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: ServiceCategory) {
    setBusy(category.slug);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/service-categories/${encodeURIComponent(category.slug)}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      setNotice(category.isActive ? "Category deactivated." : "Category activated.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update category status.");
    } finally {
      setBusy("");
    }
  }

  async function remove(category: ServiceCategory) {
    if (!window.confirm(`Permanently delete "${category.name}"? Services already in use can only be deactivated.`)) return;
    setBusy(category.slug);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/admin/service-categories/${encodeURIComponent(category.slug)}`, { method: "DELETE" });
      setNotice("Category deleted.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete category.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) closeModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, saving]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeading
        title="Service Categories"
        description="Manage the categories customers browse and professionals use for their services."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setReload((value) => value + 1)} loading={loading}>
              <RefreshCw size={14} className="mr-1.5" /> Refresh
            </Button>
            <Button onClick={startCreating}><Plus size={14} className="mr-1.5" /> Add category</Button>
          </div>
        }
      />
      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {loading ? <LoadingBlock label="Loading categories…" /> : items.length ? (
        <div className="space-y-3">
          {items.map((category) => (
            <Card key={category.slug} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-styler-ink">{category.name}</h2>
                  <StatusBadge status={category.isActive ? "active" : "inactive"} />
                </div>
                <p className="mt-1 text-[11px] text-styler-muted">{category.description || "No description"}</p>
                <a href={`/services/${encodeURIComponent(category.slug)}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-styler-accent hover:underline">
                  /services/{category.slug} <ExternalLink size={11} />
                </a>
                <p className="mt-1 text-[10px] text-styler-muted">Display order: {category.displayOrder}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button variant="secondary" onClick={() => startEditing(category)}><Pencil size={13} className="mr-1" /> Edit</Button>
                <Button variant="secondary" loading={busy === category.slug} onClick={() => void toggleActive(category)}>
                  {category.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="secondary" loading={busy === category.slug} onClick={() => void remove(category)}>
                  <Trash2 size={13} className="mr-1" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <EmptyState title="No categories yet" description="Add a category to make it available to customers and professionals." icon={<Tags size={22} />} />
        </Card>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-category-modal-title"
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-styler-line bg-styler-surface p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-styler-accent">Admin · Service Categories</p>
                <h2 id="service-category-modal-title" className="mt-1 text-xl font-bold text-styler-ink">
                  {editing ? "Edit category" : "Create category"}
                </h2>
                <p className="mt-1 text-xs text-styler-muted">Set the customer-facing name, public URL, order and description.</p>
              </div>
              <button type="button" aria-label="Close dialog" disabled={saving} onClick={closeModal} className="rounded-full p-2 text-styler-muted hover:bg-styler-surface-2 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-styler-ink-soft">
                  Service name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setForm((current) => ({
                        ...current,
                        name,
                        slug: slugTouched ? current.slug : slugify(name),
                      }));
                    }}
                    placeholder="e.g. Makeup"
                    className="mt-1.5 w-full rounded border border-styler-line bg-styler-canvas px-3 py-2.5 text-sm text-styler-ink"
                  />
                </label>
                <label className="text-xs font-semibold text-styler-ink-soft">
                  Service URL
                  <input
                    required
                    maxLength={120}
                    pattern="[a-z0-9]+(_[a-z0-9]+)*"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      setForm({ ...form, slug: slugify(event.target.value) });
                    }}
                    placeholder="hair_styling"
                    className="mt-1.5 w-full rounded border border-styler-line bg-styler-canvas px-3 py-2.5 text-sm text-styler-ink"
                  />
                  <span className="mt-1 block font-normal text-styler-muted">
                    Public page: /services/{form.slug || "your_category"}
                    {editing && " · URL changes are blocked after this category is used."}
                  </span>
                </label>
                <label className="text-xs font-semibold text-styler-ink-soft">
                  Display order
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    required
                    value={form.displayOrder}
                    onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })}
                    className="mt-1.5 w-full rounded border border-styler-line bg-styler-canvas px-3 py-2.5 text-sm text-styler-ink"
                  />
                </label>
                <label className="text-xs font-semibold text-styler-ink-soft sm:col-span-2">
                  Image URL
                  <input
                    type="url"
                    maxLength={2048}
                    value={form.image}
                    onChange={(event) => setForm({ ...form, image: event.target.value })}
                    placeholder="https://example.com/service-image.jpg"
                    className="mt-1.5 w-full rounded border border-styler-line bg-styler-canvas px-3 py-2.5 text-sm text-styler-ink"
                  />
                  <span className="mt-1 block font-normal text-styler-muted">Paste a direct public image URL.</span>
                </label>
              </div>
              <label className="block text-xs font-semibold text-styler-ink-soft">
                Description
                <textarea
                  maxLength={500}
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Describe the service for customers and professionals."
                  className="mt-1.5 w-full resize-y rounded border border-styler-line bg-styler-canvas px-3 py-2.5 text-sm text-styler-ink"
                />
                <span className="mt-1 block text-right font-normal text-styler-muted">{form.description.length}/500</span>
              </label>
              {form.image ? (
                <div className="overflow-hidden rounded-lg border border-styler-line">
                  <img src={form.image} alt={`${form.name || "Service"} preview`} className="h-36 w-full object-cover" />
                </div>
              ) : null}
              <div className="flex justify-end gap-2 border-t border-styler-line pt-4">
                <Button type="button" variant="secondary" disabled={saving} onClick={closeModal}>Cancel</Button>
                <Button type="submit" loading={saving}>
                  {editing ? <Pencil size={14} /> : <Plus size={14} />}
                  {editing ? "Save category" : "Create category"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
