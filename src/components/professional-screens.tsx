"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  Camera,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  ImagePlus,
  KeyRound,
  LocateFixed,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UploadCloud,
  UserCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { apiRequest, dateTime, humanize, money, unwrapItems } from "@/components/api-client";
import { uploadImageKit } from "@/components/imagekit-upload";
import { ProfessionalLocationEditor } from "@/components/professional-location-editor";
import { Alert, LoadingBlock } from "@/components/ui";
import { useTheme, type Theme } from "@/components/theme-provider";
import { CATEGORIES } from "@/lib/categories";

const categories = CATEGORIES.map((category) => category.slug);

function StatusPill({ status }: { status: string }) {
  let tone = "bg-styler-surface-2 text-styler-ink-soft ";
  if (["confirmed", "transferred", "approved", "active", "completed"].includes(status)) {
    tone = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50";
  } else if (["pending", "pending_payment", "sent"].includes(status)) {
    tone = "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50";
  } else if (["rejected", "declined", "hidden", "inactive"].includes(status)) {
    tone = "bg-styler-accent-soft text-styler-accent border border-styler-line-strong ";
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-semibold capitalize ${tone}`}>
      {humanize(status)}
    </span>
  );
}

{/* -------------------------------------------------------------------------- */}
{/* 1. PROFESSIONAL ONBOARDING FLOW                                           */}
{/* -------------------------------------------------------------------------- */}

export function ProfessionalOnboarding({ step = "profile" }: { step?: "profile" | "documents" | "services" | "availability" }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({
    displayName: "",
    bio: "",
    experienceYears: 0,
    categories: [],
    city: "",
    state: "",
    postalCode: "",
    baseLocation: null,
    profilePhoto: null,
    portfolioImages: [],
    documents: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [docType, setDocType] = useState("identity_proof");
  const [docFile, setDocFile] = useState<File | null>(null);

  useEffect(() => {
    apiRequest<any>("/api/professional/application")
      .then((d) =>
        setProfile({
          ...d,
          categories: d.categories || [],
          portfolioImages: d.portfolioImages || [],
          documents: d.documents || [],
          serviceAreas: d.serviceAreas || [],
        })
      )
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function update(k: string, v: any) {
    setProfile((p: any) => ({ ...p, [k]: v }));
  }

  function toggleCategory(c: string) {
    setProfile((p: any) => ({
      ...p,
      categories: p.categories.includes(c) ? p.categories.filter((x: string) => x !== c) : [...p.categories, c],
    }));
  }

  async function upload(file: File, purpose: "profile" | "portfolio" | "private_document") {
    return await uploadImageKit(file, purpose);
  }

  async function saveProfile(submit = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload: any = {
        displayName: profile.displayName || undefined,
        bio: profile.bio,
        experienceYears: Number(profile.experienceYears || 0),
        categories: profile.categories,
        city: profile.city,
        state: profile.state,
        postalCode: profile.postalCode,
        serviceAreas: profile.serviceAreas || [],
        submit,
      };
      if (Number.isFinite(profile.baseLocation?.latitude) && Number.isFinite(profile.baseLocation?.longitude)) {
        payload.baseLocation = profile.baseLocation;
      }
      if (profile.profilePhoto?.url) payload.profilePhoto = profile.profilePhoto;
      if (profile.portfolioImages?.length) payload.portfolioImages = profile.portfolioImages;

      const result = await apiRequest<any>("/api/professional/application", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setNotice(submit ? "Application submitted for admin review." : "Profile details saved.");
      if (submit) {
        router.push("/professional/onboarding");
      } else {
        setProfile((p: any) => ({ ...p, ...(result.profile || {}), documents: p.documents || [] }));
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveAndGo(path: string) {
    if (await saveProfile(false)) router.push(path);
  }

  async function uploadProfile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await upload(file, "profile");
      setProfile((p: any) => ({ ...p, profilePhoto: { url: data.url, fileId: data.fileId } }));
      setNotice("Profile photo uploaded. Save your profile to keep it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function uploadPortfolio(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: Array<{ url: string; fileId: string; altText: string; sortOrder: number }> = [];
      for (const file of files.slice(0, 8)) {
        const data = await upload(file, "portfolio");
        uploaded.push({ url: data.url, fileId: data.fileId, altText: file.name, sortOrder: profile.portfolioImages.length + uploaded.length });
      }
      setProfile((p: any) => ({ ...p, portfolioImages: [...(p.portfolioImages || []), ...uploaded] }));
      setNotice(`${uploaded.length} portfolio image(s) uploaded. Save your profile to keep them.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function uploadDoc(e: FormEvent) {
    e.preventDefault();
    if (!docFile) return;
    setUploading(true);
    setError("");
    try {
      const data = await upload(docFile, "private_document");
      const document = {
        documentType: docType,
        storageKey: data.filePath || data.fileId,
        originalFileName: docFile.name,
        mimeType: docFile.type,
        sizeBytes: docFile.size,
      };
      const docs = [...(profile.documents || []).filter((d: any) => d.documentType !== docType), document];
      await apiRequest<any>("/api/professional/application", {
        method: "PATCH",
        body: JSON.stringify({
          documents: docs.map((d: any) => ({
            documentType: d.documentType,
            storageKey: d.storageKey,
            originalFileName: d.originalFileName,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
          })),
        }),
      });
      setProfile((p: any) => ({ ...p, documents: docs }));
      setDocFile(null);
      setNotice("Document uploaded privately for verification review.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Document upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const stepList = [
    { id: "profile", label: "Profile", href: "/professional/onboarding" },
    { id: "documents", label: "Documents", href: "/professional/onboarding/documents" },
    { id: "services", label: "Services", href: "/professional/onboarding/services" },
    { id: "availability", label: "Availability", href: "/professional/onboarding/availability" },
  ];

  if (loading) return <LoadingBlock label="Loading onboarding details…" />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-styler-accent ">Professional Onboarding</p>
        <h1 className="text-xl font-bold font-serif text-styler-ink mt-1">Set up your studio</h1>
        <p className="text-xs text-styler-muted ">Complete each step to activate your professional workspace listing.</p>
      </div>

      {/* Steps Nav */}
      <div className="flex border-b border-styler-line space-x-6 overflow-x-auto">
        {stepList.map((s, i) => (
          <Link
            key={s.id}
            href={s.href}
            className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
              step === s.id
                ? "border-styler-line-strong text-styler-accent "
                : "border-transparent text-styler-muted hover:text-styler-ink "
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-styler-surface-2 text-[10px]">
              {i + 1}
            </span>
            {s.label}
          </Link>
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="warning">{notice}</Alert>}

      {/* Application Status Alert */}
      {profile.applicationStatus && (
        <div className="flex items-center justify-between rounded-xl border border-styler-line bg-styler-surface p-3.5 ">
          <div>
            <p className="text-xs font-bold text-styler-ink ">Application status</p>
            <p className="text-[10px] text-styler-muted ">{profile.reviewReason || "Your progress is saved as you build your profile."}</p>
          </div>
          <StatusPill status={profile.applicationStatus} />
        </div>
      )}

      {/* Step 1: Profile */}
      {step === "profile" && (
        <div className="rounded-2xl border border-styler-line bg-styler-surface p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-bold text-styler-ink ">Tell us about yourself</h2>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-styler-ink-soft mb-1">Display / Studio Name</label>
              <input
                type="text"
                value={profile.displayName || ""}
                onChange={(e) => update("displayName", e.target.value)}
                className="w-full rounded-xl border border-styler-line bg-styler-surface-2 px-3 py-2 text-xs text-styler-ink outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-styler-ink-soft mb-1">Years of Experience</label>
              <input
                type="number"
                value={profile.experienceYears ?? 0}
                onChange={(e) => update("experienceYears", Number(e.target.value))}
                className="w-full rounded-xl border border-styler-line bg-styler-surface-2 px-3 py-2 text-xs text-styler-ink outline-none"
              />
            </div>
          </div>

          <ProfessionalLocationEditor
            value={profile}
            onChange={(patch) => setProfile((current: any) => ({ ...current, ...patch }))}
          />

          <div>
            <label className="block text-[11px] font-semibold text-styler-ink-soft mb-1">Professional Introduction</label>
            <textarea
              rows={3}
              value={profile.bio || ""}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Tell customers about your craftsmanship and services..."
              className="w-full rounded-xl border border-styler-line bg-styler-surface-2 px-3 py-2 text-xs text-styler-ink outline-none"
            />
          </div>

          {/* Categories Grid */}
          <div>
            <label className="block text-[11px] font-semibold text-styler-ink-soft mb-2">Services Provided</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const checked = profile.categories?.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold border transition ${
                      checked
                        ? "border-styler-line-strong bg-styler-accent-soft text-styler-accent "
                        : "border-styler-line text-styler-ink-soft "
                    }`}
                  >
                    <span>{humanize(c)}</span>
                    {checked && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Upload */}
          <div>
            <label className="block text-[11px] font-semibold text-styler-ink-soft mb-2">Profile Photo</label>
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-styler-line p-3 hover:bg-styler-surface-2 ">
                <ImagePlus size={18} className="text-styler-accent" />
                <span className="text-xs text-styler-ink-soft ">{uploading ? "Uploading..." : "Select Profile Photo"}</span>
                <input type="file" accept="image/*" onChange={uploadProfile} className="hidden" />
              </label>
              {profile.profilePhoto?.url && (
                <img src={profile.profilePhoto.url} alt="Profile" className="h-10 w-10 rounded-full object-cover ring-2 ring-styler-accent" />
              )}
            </div>
          </div>

          {/* Portfolio Grid */}
          <div>
            <label className="block text-[11px] font-semibold text-styler-ink-soft mb-2">Portfolio Showcase</label>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
              {(profile.portfolioImages || []).map((img: any, i: number) => (
                <div key={i} className="relative h-16 w-full overflow-hidden rounded-lg group">
                  <img src={img.url} alt="Portfolio" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => update("portfolioImages", profile.portfolioImages.filter((_: any, j: number) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-styler-line hover:bg-styler-surface-2 ">
                <Plus size={16} className="text-styler-muted" />
                <span className="text-[9px] text-styler-muted">Add</span>
                <input type="file" accept="image/*" multiple onChange={uploadPortfolio} className="hidden" />
              </label>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end gap-3 pt-4 border-t border-styler-line ">
            <button
              type="button"
              onClick={() => saveProfile(false)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl border border-styler-line px-4 py-2 text-xs font-semibold text-styler-ink-soft hover:bg-styler-surface-2 "
            >
              <Save size={14} /> Save Draft
            </button>
            <button
              type="button"
              onClick={() => saveAndGo("/professional/onboarding/documents")}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-styler-accent px-4 py-2 text-xs font-semibold text-white hover:bg-styler-accent transition"
            >
              Next: Documents <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Documents */}
      {step === "documents" && (
        <div className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-bold text-styler-ink ">Verification Documents</h2>
          <form onSubmit={uploadDoc} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-styler-ink-soft mb-1">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-xl border border-styler-line bg-styler-surface-2 px-3 py-2 text-xs text-styler-ink outline-none"
              >
                <option value="identity_proof">Identity Proof (Aadhaar / Passport)</option>
                <option value="address_proof">Address Proof</option>
                <option value="professional_certificate">Professional Certificate</option>
                <option value="business_registration">GST / Business Registration</option>
              </select>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-styler-line p-6 hover:bg-styler-surface-2 ">
              <FileUp size={22} className="text-styler-accent mb-1" />
              <span className="text-xs font-semibold text-styler-ink-soft ">{docFile ? docFile.name : "Select document file"}</span>
              <span className="text-[10px] text-styler-muted">PDF, JPG or PNG (Max 10 MB)</span>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="hidden" />
            </label>

            <button
              type="submit"
              disabled={!docFile || uploading}
              className="flex items-center gap-1.5 rounded bg-styler-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-styler-accent"
            >
              <UploadCloud size={14} /> {uploading ? "Uploading..." : "Upload Private Document"}
            </button>
          </form>

          {/* Document List */}
          <div className="pt-4 border-t border-styler-line space-y-2">
            <p className="text-xs font-bold text-styler-ink ">Uploaded Verification Files</p>
            {(profile.documents || []).length > 0 ? (
              profile.documents.map((d: any) => (
                <div key={d.documentType} className="flex items-center justify-between rounded-xl border border-styler-line p-3">
                  <div className="flex items-center gap-2.5">
                    <FileCheck2 size={16} className="text-styler-accent" />
                    <div>
                      <p className="text-xs font-bold text-styler-ink ">{humanize(d.documentType)}</p>
                      <p className="text-[10px] text-styler-muted">{d.originalFileName || "Document"}</p>
                    </div>
                  </div>
                  <StatusPill status={d.status || "pending"} />
                </div>
              ))
            ) : (
              <p className="text-[11px] text-styler-muted">No documents uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Services */}
      {step === "services" && <ServiceManager onboarding />}

      {/* Step 4: Availability */}
      {step === "availability" && (
        <div className="space-y-4">
          <AvailabilityManager onboarding />
          <div className="rounded border border-styler-line bg-styler-surface p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-styler-ink ">Ready for Admin Review?</p>
              <p className="text-[10px] text-styler-muted">Submit your profile once services and documents are uploaded.</p>
            </div>
            <button
              type="button"
              onClick={() => saveProfile(true)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-styler-accent px-4 py-2 text-xs font-semibold text-white hover:bg-styler-accent"
            >
              Submit Application <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

{/* -------------------------------------------------------------------------- */}
{/* 2. SERVICES & OFFERINGS MANAGER                                            */}
{/* -------------------------------------------------------------------------- */}

export function ServiceManager({ onboarding = false }: { onboarding?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(onboarding);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    title: "",
    slug: "",
    category: "lehenga_stitching",
    description: "",
    pricingType: "fixed",
    price: "",
    durationMinutes: 60,
    travelBufferMinutes: 15,
    imageUrl: "",
    images: [],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const d = await apiRequest<any>("/api/professional/services?includeInactive=true");
      setItems(unwrapItems(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(item: any) {
    setEditingId(String(item._id));
    setForm({
      title: item.title || "",
      slug: item.slug || "",
      category: item.category || "other",
      description: item.description || "",
      pricingType: item.pricingType || "quote_required",
      price: item.pricePaise == null ? "" : String(item.pricePaise / 100),
      durationMinutes: item.durationMinutes || 60,
      travelBufferMinutes: item.travelBufferMinutes || 0,
      imageUrl: item.images?.[0]?.url || "",
      images: item.images || [],
    });
    setImageFile(null);
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      category: "lehenga_stitching",
      description: "",
      pricingType: "fixed",
      price: "",
      durationMinutes: 60,
      travelBufferMinutes: 15,
      imageUrl: "",
      images: [],
    });
    setImageFile(null);
    setShowForm(false);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const slug = (form.slug || form.title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      let images = Array.isArray(form.images) ? form.images : [];
      if (imageFile) {
        const uploaded = await uploadImageKit(imageFile, "portfolio");
        images = [
          ...images,
          { url: uploaded.url, fileId: uploaded.fileId, altText: imageFile.name, sortOrder: images.length },
        ];
      }
      const payload = {
        slug,
        category: form.category,
        title: form.title,
        description: form.description,
        pricingType: form.pricingType,
        pricePaise: form.pricingType === "quote_required" ? undefined : Math.round(Number(form.price) * 100),
        durationMinutes: Number(form.durationMinutes),
        travelBufferMinutes: Number(form.travelBufferMinutes),
        images,
      };
      await apiRequest(
        editingId ? `/api/professional/services/${editingId}` : "/api/professional/services",
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) }
      );
      setNotice(editingId ? "Service updated successfully." : "Service created successfully.");
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save service.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(item: any) {
    const active = Boolean(item.isActive);
    if (active && !confirm(`Hide "${item.title}" from active services?`)) return;
    setError("");
    setNotice("");
    try {
      if (active) {
        await apiRequest(`/api/professional/services/${item._id}`, { method: "DELETE" });
      } else {
        await apiRequest(`/api/professional/services/${item._id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: true }),
        });
      }
      setNotice(active ? "Service hidden from your public listings." : "Service restored to your public listings.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update service.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-styler-ink ">Services & Offerings</h2>
          <p className="text-[10px] text-styler-muted">Manage your active service listings and pricing.</p>
        </div>
        {!onboarding && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded bg-styler-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-styler-accent"
          >
            <Plus size={14} /> Add Service
          </button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {showForm && (
        <form onSubmit={create} className="rounded border border-styler-line bg-styler-surface p-5 space-y-4">
          <h3 className="text-xs font-bold text-styler-ink ">{editingId ? "Edit Service Listing" : "New Service Listing"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{humanize(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Pricing Type</label>
              <select
                value={form.pricingType}
                onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
                className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
              >
                <option value="fixed">Fixed Price</option>
                <option value="starting_from">Starting From</option>
                <option value="quote_required">Quote Required</option>
              </select>
            </div>
            {form.pricingType !== "quote_required" && (
              <div>
                <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Duration (minutes)</label>
              <input
                type="number"
                required
                min={15}
                max={1440}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Travel buffer (minutes)</label>
              <input
                type="number"
                min={0}
                max={240}
                value={form.travelBufferMinutes}
                onChange={(e) => setForm({ ...form, travelBufferMinutes: e.target.value })}
                className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-styler-ink-soft mb-1">Description</label>
            <textarea
              rows={2}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-1.5 text-xs text-styler-ink outline-none"
            />
          </div>

          <label className="block text-[10px] font-semibold text-styler-ink-soft ">
            Service image
            {form.imageUrl && !imageFile && <span className="ml-2 font-normal text-styler-muted">Current image saved</span>}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              className="mt-1 block w-full text-[10px] text-styler-muted file:mr-3 file:rounded-lg file:border-0 file:bg-styler-accent-soft file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-styler-accent dark:file:bg-pink-950/40 dark:file:text-styler-accent"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm} className="px-3 py-1.5 text-xs text-styler-muted">Cancel</button>
            <button type="submit" disabled={busy} className="rounded bg-styler-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-styler-accent">
              Save Service
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingBlock />
      ) : items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s._id} className="rounded border border-styler-line bg-styler-surface p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-styler-accent ">{humanize(s.category)}</span>
                  <StatusPill status={s.isActive ? "active" : "hidden"} />
                </div>
                <h3 className="text-xs font-bold text-styler-ink mt-1">{s.title}</h3>
                <p className="text-[10px] text-styler-muted mt-1 line-clamp-2">{s.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-styler-line ">
                <span className="text-xs font-bold text-styler-ink ">
                  {s.pricingType === "quote_required" ? "Quote Required" : money(s.pricePaise)}
                </span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => edit(s)} aria-label={`Edit ${s.title}`} title="Edit service" className="text-styler-muted transition hover:text-styler-accent">
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deactivate(s)}
                    aria-label={s.isActive ? `Hide ${s.title}` : `Restore ${s.title}`}
                    title={s.isActive ? "Hide service" : "Restore service"}
                    className="text-styler-muted hover:text-styler-accent transition"
                  >
                    {s.isActive ? <Trash2 size={14} /> : <Check size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-styler-line bg-styler-surface p-8 text-center ">
          <Scissors size={22} className="mx-auto mb-2 text-styler-muted" />
          <p className="text-xs font-bold text-styler-ink ">No services listed yet</p>
          <p className="mt-1 text-[10px] text-styler-muted ">Add a service to show customers what your studio offers.</p>
          {!onboarding && (
            <button type="button" onClick={() => setShowForm(true)} className="mt-4 rounded bg-styler-accent px-3 py-2 text-[10px] font-semibold text-white hover:bg-styler-accent">
              <Plus size={13} className="mr-1 inline" /> Add service
            </button>
          )}
        </div>
      )}
    </div>
  );
}

{/* -------------------------------------------------------------------------- */}
{/* 3. AVAILABILITY & WORKING HOURS                                            */}
{/* -------------------------------------------------------------------------- */}

export function AvailabilityManager({ onboarding = false }: { onboarding?: boolean }) {
  const [data, setData] = useState<any>({
    timezone: "Asia/Kolkata",
    acceptingRequests: false,
    slotIntervalMinutes: 15,
    maxAdvanceBookingDays: 30,
    weeklySchedule: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isClosed: true,
      intervals: [],
    })),
  });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<any>("/api/professional/availability")
      .then((d) => {
        if (!active) return;
        if (d) {
          setData((current: any) => ({
            ...current,
            ...d,
            acceptingRequests: Boolean(d.acceptingRequests),
            weeklySchedule: d.weeklySchedule?.length ? d.weeklySchedule : current.weeklySchedule,
          }));
        }
        setLoaded(true);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load availability.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function updateDay(weekday: number, field: string, value: any) {
    setData((d: any) => ({
      ...d,
      weeklySchedule: d.weeklySchedule.map((x: any) =>
        x.weekday === weekday
          ? {
              ...x,
              [field]: value,
              intervals: field === "isClosed" && value
                ? []
                : x.intervals?.length
                  ? x.intervals
                  : [{ startMinute: 600, endMinute: 1080 }],
            }
          : x
      ),
    }));
  }

  function minuteToTime(n: number) {
    return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  }

  function timeToMinute(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function updateInterval(weekday: number, index: number, field: "startMinute" | "endMinute", value: number) {
    setData((current: any) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day: any) =>
        day.weekday === weekday
          ? {
              ...day,
              intervals: day.intervals.map((interval: any, intervalIndex: number) =>
                intervalIndex === index
                  ? {
                      ...interval,
                      [field]: field === "startMinute"
                        ? Math.max(0, Math.min(value, interval.endMinute - 1))
                        : Math.min(1440, Math.max(value, interval.startMinute + 1)),
                    }
                  : interval
              ),
            }
          : day
      ),
    }));
  }

  function addInterval(weekday: number) {
    setData((current: any) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day: any) => {
        if (day.weekday !== weekday || day.intervals.length >= 12) return day;
        const lastEnd = day.intervals.reduce(
          (latest: number, interval: any) => Math.max(latest, interval.endMinute),
          600
        );
        if (lastEnd >= 1440) return day;
        return {
          ...day,
          intervals: [...day.intervals, { startMinute: lastEnd, endMinute: Math.min(lastEnd + 60, 1440) }],
        };
      }),
    }));
  }

  function removeInterval(weekday: number, index: number) {
    setData((current: any) => ({
      ...current,
      weeklySchedule: current.weeklySchedule.map((day: any) =>
        day.weekday === weekday
          ? { ...day, intervals: day.intervals.filter((_: any, intervalIndex: number) => intervalIndex !== index) }
          : day
      ),
    }));
  }

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/professional/availability", { method: "PUT", body: JSON.stringify(data) });
      setNotice("Weekly schedule updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save availability.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;

 
return (
    <div className="w-full min-w-0 space-y-4 rounded border border-styler-line bg-styler-surface p-4 sm:p-5 ">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-styler-ink ">Weekly Working Hours</h2>
          <p className="mt-1 text-xs text-styler-muted">Set standard operating hours for booking slots.</p>
        </div>
        <button type="button" onClick={save} disabled={busy || !loaded} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-styler-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-styler-accent disabled:cursor-not-allowed disabled:opacity-50">
          <Save size={13} /> Save Schedule
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid grid-cols-1 gap-4 border-b border-styler-line pb-4 sm:grid-cols-2 lg:grid-cols-3 ">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-styler-ink-soft ">
          Time zone
          <input
            value={data.timezone}
            onChange={(event) => setData((current: any) => ({ ...current, timezone: event.target.value }))}
            className="h-9 w-full min-w-0 rounded-lg border border-styler-line bg-styler-surface-2 px-3 text-xs text-styler-ink outline-none focus:border-styler-line-strong "
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-styler-ink-soft ">
          Booking slot interval
          <select
            value={data.slotIntervalMinutes}
            onChange={(event) => setData((current: any) => ({ ...current, slotIntervalMinutes: Number(event.target.value) }))}
            className="h-9 w-full min-w-0 rounded-lg border border-styler-line bg-styler-surface-2 px-3 text-xs text-styler-ink outline-none focus:border-styler-line-strong "
          >
            {[15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-styler-ink-soft sm:col-span-2 lg:col-span-1 ">
          Advance booking limit
          <input
            type="number"
            min={1}
            max={180}
            value={data.maxAdvanceBookingDays}
            onChange={(event) => setData((current: any) => ({ ...current, maxAdvanceBookingDays: Number(event.target.value) }))}
            className="h-9 w-full min-w-0 rounded-lg border border-styler-line bg-styler-surface-2 px-3 text-xs text-styler-ink outline-none focus:border-styler-line-strong "
          />
        </label>
      </div>

      <div className="space-y-3 pt-1">
        {days.map((day, weekday) => {
          const current = data.weeklySchedule.find((d: any) => d.weekday === weekday) || { weekday, isClosed: true, intervals: [] };

          return (
            <div key={day} className="min-w-0 space-y-3 rounded-lg border-b border-styler-line pb-4 pt-2 text-xs ">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-styler-ink ">{day}</span>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-xs text-styler-muted ">
                  <input
                    type="checkbox"
                    checked={Boolean(current.isClosed)}
                    onChange={(e) => updateDay(weekday, "isClosed", e.target.checked)}
                    className="h-4 w-4 rounded border-styler-line accent-pink-600"
                  />
                  Closed
                </label>
              </div>

              {!current.isClosed && (
                <div className="space-y-3">
                  {current.intervals.map((interval: any, index: number) => (
                    <div key={`${weekday}-${index}`} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        aria-label={`${day} interval ${index + 1} start`}
                        value={minuteToTime(interval.startMinute)}
                        onChange={(event) => updateInterval(weekday, index, "startMinute", timeToMinute(event.target.value))}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-styler-line bg-styler-surface-2 px-2 text-xs text-styler-ink outline-none focus:border-styler-line-strong sm:flex-none "
                      />
                      <span className="shrink-0 text-xs text-styler-muted">to</span>
                      <input
                        type="time"
                        aria-label={`${day} interval ${index + 1} end`}
                        value={minuteToTime(interval.endMinute)}
                        onChange={(event) => updateInterval(weekday, index, "endMinute", timeToMinute(event.target.value))}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-styler-line bg-styler-surface-2 px-2 text-xs text-styler-ink outline-none focus:border-styler-line-strong sm:flex-none "
                      />
                      {current.intervals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeInterval(weekday, index)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-styler-accent hover:bg-styler-accent-soft "
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addInterval(weekday)}
                    disabled={current.intervals.length >= 12 || (current.intervals.length > 0 && current.intervals.every((interval: any) => interval.endMinute >= 1440))}
                    className="inline-flex items-center gap-1 py-1 text-xs font-semibold text-styler-accent hover:underline disabled:opacity-50 "
                  >
                    Add time interval
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


{/* -------------------------------------------------------------------------- */}
{/* 4. INCOMING REQUESTS & OFFERS                                              */}
{/* -------------------------------------------------------------------------- */}

export function ProfessionalRequests() {
  const [items, setItems] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [acceptedBookingId, setAcceptedBookingId] = useState("");
  const [busy, setBusy] = useState("");
  const refreshing = useRef(false);
  const router = useRouter();

  async function load(pageNumber = page, showLoading = true) {
    if (refreshing.current) return;
    refreshing.current = true;
    if (showLoading) setLoading(true);
    setError("");
    try {
      const d = await apiRequest<any>(`/api/professional/requests?limit=100&page=${pageNumber}`);
      setReadiness(d?.readiness || null);
      const nextItems = unwrapItems(d);
      const pages = Math.max(1, Number(d?.totalPages) || 1);
      setTotalPages(pages);
      if (pageNumber > pages) {
        setPage(pages);
        return;
      }
      setItems(unwrapItems(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load offers.");
    } finally {
      if (showLoading) setLoading(false);
      refreshing.current = false;
    }
  }

  useEffect(() => {
    void load(page);
    const refresh = () => {
      if (!document.hidden) void load(page, false);
    };
    const timer = window.setInterval(refresh, 5_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [page]);

  async function act(item: any, action: "accept" | "reject") {
    const id = String(item._id);
    let quotePaise: number | undefined;
    if (action === "accept" && item.service?.pricingType === "quote_required") {
      const input = window.prompt("Enter your service quote in rupees (example: 2500.00):");
      if (input === null) return;
      if (!/^\d+(?:\.\d{1,2})?$/.test(input.trim())) {
        setError("Enter a valid rupee amount with up to two decimal places.");
        return;
      }
      quotePaise = Math.round(Number(input) * 100);
      if (!Number.isSafeInteger(quotePaise) || quotePaise < 100) {
        setError("Quote must be at least ₹1.00.");
        return;
      }
      if (
        item.request?.budgetMinPaise != null && quotePaise < item.request.budgetMinPaise
        || item.request?.budgetMaxPaise != null && quotePaise > item.request.budgetMaxPaise
      ) {
        setError("Your quote must be within the customer's budget range.");
        return;
      }
    }

    setBusy(id + action);
    setError("");
    try {
      const result = await apiRequest<any>(`/api/booking-offers/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ ...(quotePaise !== undefined ? { quotePaise } : {}) }),
      });
      setNotice(action === "accept" ? "Offer accepted." : "Offer declined.");
      setAcceptedBookingId(action === "accept" ? String(result?._id || "") : "");
      setSelectedOfferId("");
      if (action === "accept" && result?._id) {
        router.push(`/professional/bookings/${result._id}#booking-chat`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process offer.");
    } finally {
      setBusy("");
    }
  }

  const selectedOffer = items.find((offer) => String(offer._id) === selectedOfferId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-styler-ink ">Booking Requests</h2>
          <p className="text-[10px] text-styler-muted">New offers appear automatically here and as an alert across your workspace.</p>
        </div>
        <button type="button" onClick={() => void load()} className="p-1.5 rounded border border-styler-line text-styler-ink-soft ">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && (
        <Alert tone="success">
          {notice}
          {acceptedBookingId && (
            <Link href={`/professional/bookings/${acceptedBookingId}`} className="ml-2 underline">
              Open booking chat
            </Link>
          )}
        </Alert>
      )}
      {!loading && readiness && !items.length && (
        <Alert tone="warning">
          <div className="space-y-2">
            <p>No active offer matches this professional profile right now. To become eligible, keep an active service and availability schedule, and turn on request acceptance.</p>
            <ul className="list-inside list-disc">
              {!readiness.acceptingRequests && <li>New requests are currently turned off.</li>}
              {!readiness.activeServiceCount && <li>Add and activate at least one service listing.</li>}
              {!readiness.hasAvailabilitySchedule && <li>Set your weekly availability schedule.</li>}
              {!readiness.hasCityAndState && <li>Complete your service city and state in your profile.</li>}
              {readiness.hasCityAndState && !readiness.hasServiceLocation && <li>Set your studio pin to receive customer requests that include an exact GPS location.</li>}
            </ul>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link className="text-xs font-semibold underline" href="/professional/profile">Check service location</Link>
              <Link className="text-xs font-semibold underline" href="/professional/services">Manage services</Link>
              <Link className="text-xs font-semibold underline" href="/professional/availability">Manage availability</Link>
            </div>
          </div>
        </Alert>
      )}

      {loading ? (
        <LoadingBlock />
      ) : items.length > 0 ? (
        <div className="grid gap-3">
          {items.map((o) => (
            <div key={o._id} className="rounded border border-styler-line bg-styler-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-styler-accent" />
                  <h3 className="text-xs font-bold text-styler-ink ">{humanize(o.request?.serviceCategory || "Fashion Service")}</h3>
                </div>
                <StatusPill status={o.status} />
              </div>

              <p className="text-[11px] text-styler-ink-soft ">{o.request?.requirements || "No additional requirements were provided."}</p>
              {o.service?.pricingType === "quote_required" && (
                <p className="text-xs font-semibold text-styler-accent">Customer requested a quote</p>
              )}
              {o.service?.pricingType !== "quote_required" && (
                <p className="text-xs font-semibold text-styler-accent">
                  Service price: {money(o.quotedPricePaise)}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-[10px] text-styler-muted border-t border-styler-line pt-2">
                <span className="flex items-center gap-1"><MapPin size={11} />{o.request?.city || "Location not provided"}</span>
                <span>Within {o.request?.searchRadiusKm ?? 25} km</span>
                {o.request?.distanceKm != null && <span>About {o.request.distanceKm} km away</span>}
                {o.request?.preferredStartAt && <span>{dateTime(o.request.preferredStartAt)}</span>}
                {o.request?.budgetMaxPaise != null && <span>Budget up to {money(o.request.budgetMaxPaise)}</span>}
                <span className="flex items-center gap-1"><Clock3 size={11} />Expires {dateTime(o.expiresAt)}</span>
              </div>

              {o.status === "sent" && (
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedOfferId(String(o._id))} className="rounded border border-styler-line px-3 py-1 text-xs text-styler-ink-soft">
                    View details
                  </button>
                  <button type="button" onClick={() => act(o, "reject")} disabled={busy === o._id + "reject"} className="rounded border border-styler-line px-3 py-1 text-xs text-styler-ink-soft ">
                    Decline
                  </button>
                  <button type="button" onClick={() => act(o, "accept")} disabled={busy === o._id + "accept"} className="rounded bg-styler-accent px-3 py-1 text-xs font-semibold text-white hover:bg-styler-accent">
                    Accept Offer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-styler-line bg-styler-surface p-8 text-center ">
          <Sparkles size={20} className="mx-auto text-styler-muted mb-2" />
          <p className="text-xs font-bold text-styler-ink ">No active requests right now</p>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-styler-line pt-3 ">
          <span className="text-[10px] text-styler-muted">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1 || loading} className="rounded-lg border border-styler-line px-3 py-1.5 text-[10px] text-styler-ink-soft disabled:opacity-50 ">Previous</button>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading} className="rounded-lg border border-styler-line px-3 py-1.5 text-[10px] text-styler-ink-soft disabled:opacity-50 ">Next</button>
          </div>
        </div>
      )}
      {selectedOffer && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-offer-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-styler-line bg-styler-surface p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-styler-accent">New booking offer</p>
                <h2 id="incoming-offer-title" className="mt-1 text-xl font-bold text-styler-ink">
                  {humanize(selectedOffer.request?.serviceCategory || "Service request")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOfferId("")}
                aria-label="Close offer details"
                className="rounded border border-styler-line px-3 py-1 text-sm text-styler-ink-soft hover:bg-styler-surface-2"
              >
                Close
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-styler-ink-soft">
              {selectedOffer.request?.requirements || "No additional requirements were provided."}
            </p>
            <dl className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-styler-canvas p-4 text-xs sm:grid-cols-2">
              <div><dt className="text-styler-muted">Service</dt><dd className="mt-1 font-semibold text-styler-ink">{selectedOffer.service?.title || humanize(selectedOffer.request?.serviceCategory || "")}</dd></div>
              <div><dt className="text-styler-muted">Customer area</dt><dd className="mt-1 font-semibold text-styler-ink">{[selectedOffer.request?.city, selectedOffer.request?.state, selectedOffer.request?.postalCode].filter(Boolean).join(", ") || "Not provided"}</dd></div>
              <div><dt className="text-styler-muted">Approx. distance</dt><dd className="mt-1 font-semibold text-styler-ink">{selectedOffer.request?.distanceKm == null ? "Not available" : `About ${selectedOffer.request.distanceKm} km`}</dd></div>
              <div><dt className="text-styler-muted">Preferred appointment</dt><dd className="mt-1 font-semibold text-styler-ink">{dateTime(selectedOffer.request?.preferredStartAt)} – {dateTime(selectedOffer.request?.preferredEndAt)}</dd></div>
              <div><dt className="text-styler-muted">Duration</dt><dd className="mt-1 font-semibold text-styler-ink">{selectedOffer.request?.requestedDurationMinutes || 60} minutes</dd></div>
              <div><dt className="text-styler-muted">Your offer</dt><dd className="mt-1 font-semibold text-styler-ink">{selectedOffer.service?.pricingType === "quote_required" ? "Quote required on acceptance" : money(selectedOffer.quotedPricePaise)}</dd></div>
              <div><dt className="text-styler-muted">Customer budget</dt><dd className="mt-1 font-semibold text-styler-ink">{selectedOffer.request?.budgetMinPaise != null ? money(selectedOffer.request.budgetMinPaise) : "No minimum"} – {selectedOffer.request?.budgetMaxPaise != null ? money(selectedOffer.request.budgetMaxPaise) : "No maximum"}</dd></div>
              <div><dt className="text-styler-muted">Search radius</dt><dd className="mt-1 font-semibold text-styler-ink">{selectedOffer.request?.searchRadiusKm ?? 25} km</dd></div>
              <div><dt className="text-styler-muted">Offer expires</dt><dd className="mt-1 font-semibold text-styler-ink">{dateTime(selectedOffer.expiresAt)}</dd></div>
            </dl>
            {selectedOffer.request?.referenceImages?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-styler-ink">Reference images</p>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedOffer.request.referenceImages.map((image: any) => (
                    <a key={image._id || image.url} href={image.url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={image.url} alt={image.caption || "Customer reference"} className="h-20 w-20 rounded-lg object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-[11px] text-styler-muted">The exact service address is shared only after acceptance. Accepting creates a pending-payment booking; the customer must complete checkout.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void act(selectedOffer, "reject")}
                disabled={Boolean(busy)}
                className="rounded-lg border border-styler-line px-4 py-2 text-sm font-semibold text-styler-ink-soft disabled:opacity-50"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => void act(selectedOffer, "accept")}
                disabled={Boolean(busy)}
                className="rounded-lg bg-styler-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Accept request
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

{/* -------------------------------------------------------------------------- */}
{/* 5. EARNINGS & PAYOUT HISTORY                                              */}
{/* -------------------------------------------------------------------------- */}

export function ProfessionalEarnings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [payoutAccount, setPayoutAccount] = useState<any>(null);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<any>(`/api/professional/earnings?limit=100&page=${page}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setTotalPages(Math.max(1, Number(result?.totalPages) || 1));
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load earnings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page]);

  useEffect(() => {
    let active = true;
    apiRequest<any>("/api/professional/payout-account")
      .then((result) => {
        if (!active) return;
        setPayoutAccount(result.payoutAccount);
        setApplicationStatus(result.applicationStatus || "");
        setAccountHolderName(result.payoutAccount?.accountHolderName || "");
        setUpiId(result.payoutAccount?.upiId || "");
      })
      .catch((cause) => {
        if (active) setAccountError(cause instanceof Error ? cause.message : "Could not load payout account.");
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitPayoutAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountBusy(true);
    setAccountError("");
    setAccountNotice("");
    try {
      const result = await apiRequest<any>("/api/professional/payout-account", {
        method: "PATCH",
        body: JSON.stringify({
          accountHolderName: accountHolderName.trim(),
          upiId: upiId.trim(),
        }),
      });
      setPayoutAccount(result.payoutAccount);
      setAccountNotice(result.message || "Payout account submitted for verification.");
    } catch (cause) {
      setAccountError(cause instanceof Error ? cause.message : "Could not submit payout account.");
    } finally {
      setAccountBusy(false);
    }
  }

  const summary = data?.summary;
  const items = unwrapItems(data);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-styler-ink ">Earnings & Transfers</h2>
        <p className="text-[10px] text-styler-muted">
          Customers pay Styler through Razorpay. After a booking is completed, Styler admins transfer your share to your verified UPI ID and record the transaction reference here.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <section className="space-y-3 rounded border border-styler-line bg-styler-surface p-4">
            <div>
              <h3 className="text-xs font-bold text-styler-ink">UPI payout details</h3>
              <p className="mt-1 text-[10px] text-styler-muted">
                Add your UPI ID and the account holder name. Styler reviews the details; entering a UPI ID does not itself verify ownership. Payouts are sent manually by Styler after service completion.
              </p>
            </div>
            {accountError && <Alert tone="error">{accountError}</Alert>}
            {accountNotice && <Alert tone="success">{accountNotice}</Alert>}
            {accountLoading ? (
              <p className="text-[11px] text-styler-muted">Loading payout account status...</p>
            ) : applicationStatus !== "approved" ? (
              <p className="text-[11px] text-styler-muted">Payout setup is available after your professional application is approved.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-styler-ink-soft">
                  <StatusPill status={payoutAccount?.status || "not_started"} />
                  {payoutAccount?.verifiedAt && <span>Verified {dateTime(payoutAccount.verifiedAt)}</span>}
                </div>
                {payoutAccount?.reviewReason && (
                  <p className="text-[11px] text-rose-600">{payoutAccount.reviewReason}</p>
                )}
                <form onSubmit={submitPayoutAccount} className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1 text-[10px] font-medium text-styler-muted">
                    Account holder name
                    <input
                      value={accountHolderName}
                      onChange={(event) => setAccountHolderName(event.target.value)}
                      placeholder="Name on the UPI account"
                      minLength={2}
                      maxLength={120}
                      required
                      className="block w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-2 text-xs text-styler-ink outline-none focus:border-styler-accent"
                    />
                  </label>
                  <label className="space-y-1 text-[10px] font-medium text-styler-muted">
                    UPI ID
                    <input
                      value={upiId}
                      onChange={(event) => setUpiId(event.target.value)}
                      placeholder="name@bank"
                      minLength={4}
                      maxLength={256}
                      required
                      className="block w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-2 text-xs text-styler-ink outline-none focus:border-styler-accent"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={accountBusy}
                    className="inline-flex items-center justify-center rounded bg-styler-accent px-4 py-2 text-xs font-semibold text-white hover:bg-styler-accent-strong disabled:opacity-60 sm:col-span-2"
                  >
                    {accountBusy ? "Submitting..." : payoutAccount?.status === "verified" ? "Update UPI details" : "Submit for verification"}
                  </button>
                </form>
              </>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-styler-line bg-styler-surface p-3.5 ">
              <p className="text-[10px] font-medium text-styler-muted">Total Volume</p>
              <p className="text-lg font-bold text-styler-ink mt-1">{money(summary?.totalGrossPaise)}</p>
            </div>
            <div className="rounded border border-styler-line bg-styler-surface p-3.5 ">
              <p className="text-[10px] font-medium text-styler-muted">Commission</p>
              <p className="text-lg font-bold text-styler-ink mt-1">{money(summary?.totalCommissionPaise)}</p>
            </div>
            <div className="rounded border border-styler-line bg-styler-surface p-3.5 ">
              <p className="text-[10px] font-medium text-styler-muted">Paid Out</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{money(summary?.paidPaise)}</p>
            </div>
            <div className="rounded border border-styler-line bg-styler-surface p-3.5 ">
              <p className="text-[10px] font-medium text-styler-muted">Pending</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{money(summary?.pendingPaise)}</p>
            </div>
          </div>

          <div className="rounded border border-styler-line bg-styler-surface p-4 ">
            <h3 className="text-xs font-bold text-styler-ink mb-3">Payout Log</h3>
            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-styler-line text-[9px] font-bold uppercase text-styler-muted ">
                      <th className="pb-2">Booking ID</th>
                      <th className="pb-2">Gross</th>
                      <th className="pb-2">Your Share</th>
                      <th className="pb-2">Transfer Reference</th>
                      <th className="pb-2 text-right">Status</th>
                      <th className="pb-2 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-styler-line ">
                    {items.map((p: any) => (
                      <tr key={p._id}>
                        <td className="py-2.5 font-bold text-styler-ink ">{String(p.bookingId || "").slice(-8) || "—"}</td>
                        <td className="py-2.5 text-styler-muted">{money(p.grossAmountPaise)}</td>
                        <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{money(p.amountPaise)}</td>
                        <td className="py-2.5 font-mono text-[10px] text-styler-muted">{p.manualTransactionReference || p.providerTransferId || "—"}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <StatusPill status={p.status} />
                            <span className="max-w-56 text-[9px] text-styler-muted">
                              {p.status === "pending"
                                ? "Ready for Styler admin to transfer via UPI."
                                : p.status === "on_hold"
                                  ? p.failureReason || "Waiting for payout details to be verified."
                                  : p.status === "processing" && p.manualPreparedAt
                                    ? "Admin is preparing the UPI transfer."
                                    : p.status === "transferred"
                                      ? "Transfer recorded by Styler."
                                      : p.failureReason || ""}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right">
                          {p.status === "transferred" && (
                            <a
                              href={`/api/receipts/payout/${p._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded bg-styler-accent px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                            >
                              <ReceiptText size={12} /> Receipt
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[10px] text-styler-muted text-center py-4">No transfer records found yet.</p>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-styler-line pt-3 ">
              <span className="text-[10px] text-styler-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1 || loading} className="rounded-lg border border-styler-line px-3 py-1.5 text-[10px] text-styler-ink-soft disabled:opacity-50 ">Previous</button>
                <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading} className="rounded-lg border border-styler-line px-3 py-1.5 text-[10px] text-styler-ink-soft disabled:opacity-50 ">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

{/* -------------------------------------------------------------------------- */}
{/* 6. SETTINGS & PROFILE CONFIG                                               */}
{/* -------------------------------------------------------------------------- */}

export function ProfessionalSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    Promise.all([
      apiRequest<any>("/api/professional/application"),
      apiRequest<any>("/api/professional/availability"),
      apiRequest<any>("/api/account/profile"),
    ])
      .then(([p, a, user]) => {
        setProfile(p);
        setAvailability(a);
        setAccount(user);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function updateAccount(key: string, value: any) {
    setAccount((current: any) => ({ ...current, [key]: value }));
  }

  async function toggle(value: boolean) {
    setBusy("availability");
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<any>("/api/professional/accepting-requests", {
        method: "PATCH",
        body: JSON.stringify({ acceptingRequests: value }),
      });
      setAvailability((current: any) => ({
        ...current,
        ...updated,
        acceptingRequests: Boolean(updated?.acceptingRequests ?? value),
      }));
      setNotice(value ? "Accepting new requests." : "Requests paused.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update setting.");
    } finally {
      setBusy("");
    }
  }

  async function saveAccount(event: FormEvent) {
    event.preventDefault();
    setBusy("account");
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<any>("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: account.name,
          phone: account.phone || "",
          profileImageUrl: account.profileImageUrl || "",
        }),
      });
      setAccount(updated);
      setNotice("Account details saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your account details.");
    } finally {
      setBusy("");
    }
  }

  async function uploadAccountPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const uploaded = await uploadImageKit(file, "profile");
      updateAccount("profileImageUrl", uploaded.url);
      setNotice("Photo uploaded. Save account details to apply it.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload your photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveNotifications(key: "email" | "webPush", value: boolean) {
    const notificationPreferences = { ...account.notificationPreferences, [key]: value };
    setAccount((current: any) => ({ ...current, notificationPreferences }));
    setBusy("notifications");
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<any>("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ notificationPreferences }),
      });
      setAccount(updated);
      setNotice("Notification preferences saved.");
    } catch (cause) {
      setAccount((current: any) => ({
        ...current,
        notificationPreferences: { ...current.notificationPreferences, [key]: !value },
      }));
      setError(cause instanceof Error ? cause.message : "Could not save notification preferences.");
    } finally {
      setBusy("");
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setBusy("password");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<any>("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify(password),
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice(result?.message || "Password changed successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change your password.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <LoadingBlock />;
  if (!profile) return <Alert tone="error">{error || "Your professional profile could not be loaded."}</Alert>;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-styler-accent">Professional workspace</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-styler-ink">Settings</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-styler-muted">
              Manage your account, notifications, appearance, security and booking availability in one place.
            </p>
          </div>
          <Link href="/professional/profile" className="inline-flex items-center gap-1.5 self-start rounded border border-styler-line px-3 py-2 text-xs font-semibold text-styler-ink transition hover:bg-styler-surface-2 sm:self-auto">
            View studio profile <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <form onSubmit={saveAccount} className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-styler-accent-soft text-styler-accent"><UserRound size={17} /></span>
          <div>
            <h2 className="text-sm font-bold text-styler-ink">Account details</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-styler-muted">These details are for signing in and contacting you. Your public studio name is managed on your profile.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-styler-ink">
              Full name
              <input value={account?.name || ""} onChange={(event) => updateAccount("name", event.target.value)} required minLength={2} maxLength={100} className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" />
            </label>
            <label className="block text-xs font-semibold text-styler-ink">
              Mobile number
              <input type="tel" value={account?.phone || ""} onChange={(event) => updateAccount("phone", event.target.value)} maxLength={20} autoComplete="tel" className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" />
            </label>
            <label className="block text-xs font-semibold text-styler-ink sm:col-span-2">
              Email address
              <input value={account?.email || ""} readOnly className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface-2 px-3 py-2.5 text-sm font-normal text-styler-muted" />
              <span className="mt-1 block text-[10px] font-normal text-styler-muted">Email changes require verification and aren’t available here.</span>
            </label>
          </div>
          <div className="flex flex-col items-center justify-center rounded border border-styler-line bg-styler-surface-2 p-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-styler-line bg-styler-surface text-styler-accent">
              {account?.profileImageUrl ? <img src={account.profileImageUrl} alt="Account profile" className="h-full w-full object-cover" /> : <UserRound size={30} />}
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded border border-styler-line bg-styler-surface px-3 py-2 text-[11px] font-semibold text-styler-ink hover:bg-styler-surface-2">
              <Camera size={13} /> {uploading ? "Uploading..." : "Change photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={uploadAccountPhoto} disabled={uploading} />
            </label>
            <span className="mt-1 text-center text-[9px] text-styler-muted">ImageKit upload · Save to apply</span>
          </div>
        </div>
        <div className="mt-4 flex justify-end border-t border-styler-line pt-4">
          <button type="submit" disabled={busy !== "" || uploading} className="inline-flex items-center gap-1.5 rounded bg-styler-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-styler-accent-strong disabled:opacity-60">
            <Save size={13} /> {busy === "account" ? "Saving..." : "Save account details"}
          </button>
        </div>
      </form>

      <section className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"><Bell size={17} /></span>
          <div>
            <h2 className="text-sm font-bold text-styler-ink">Notifications</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-styler-muted">Choose where you want to receive booking and account updates.</p>
          </div>
        </div>
        <div className="mt-4 divide-y divide-styler-line">
          {[
            { key: "email" as const, label: "Email updates", description: `Important updates sent to ${account?.email || "your email address"}.`, icon: Mail },
            { key: "webPush" as const, label: "Browser notifications", description: "Updates delivered to this browser when notifications are enabled.", icon: Bell },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <label key={item.key} className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
                <span className="flex items-start gap-3">
                  <Icon size={15} className="mt-0.5 text-styler-muted" />
                  <span><strong className="block text-xs text-styler-ink">{item.label}</strong><span className="mt-0.5 block text-[10px] text-styler-muted">{item.description}</span></span>
                </span>
                <input type="checkbox" checked={account?.notificationPreferences?.[item.key] !== false} disabled={busy !== ""} onChange={(event) => void saveNotifications(item.key, event.target.checked)} className="h-4 w-4 rounded border-styler-line text-styler-accent focus:ring-styler-accent" />
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"><Monitor size={17} /></span>
          <div>
            <h2 className="text-sm font-bold text-styler-ink">Appearance</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-styler-muted">Choose how Styler looks on this device. System follows your device preference.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { value: "light" as Theme, label: "Light", icon: Sun },
            { value: "dark" as Theme, label: "Dark", icon: Moon },
            { value: "system" as Theme, label: "System", icon: Monitor },
          ].map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button key={option.value} type="button" onClick={() => setTheme(option.value)} aria-pressed={selected} className={`flex items-center gap-2 rounded border px-3 py-3 text-xs font-semibold transition ${selected ? "border-styler-accent bg-styler-accent-soft text-styler-accent" : "border-styler-line text-styler-ink hover:bg-styler-surface-2"}`}>
                <Icon size={15} /> {option.label}
                {selected && <Check size={13} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={changePassword} className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><KeyRound size={17} /></span>
          <div>
            <h2 className="text-sm font-bold text-styler-ink">Password & security</h2>
            <p className="mt-0.5 text-[11px] leading-5 text-styler-muted">Use a unique password with at least 8 characters. Other active sessions will be signed out after the change.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-styler-ink">Current password<input type="password" autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))} required minLength={1} maxLength={128} className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" /></label>
          <label className="block text-xs font-semibold text-styler-ink">New password<input type="password" autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))} required minLength={8} maxLength={128} className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" /></label>
          <label className="block text-xs font-semibold text-styler-ink">Confirm new password<input type="password" autoComplete="new-password" value={password.confirmPassword} onChange={(event) => setPassword((current) => ({ ...current, confirmPassword: event.target.value }))} required minLength={8} maxLength={128} className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" /></label>
        </div>
        <div className="mt-4 flex justify-end border-t border-styler-line pt-4">
          <button type="submit" disabled={busy !== ""} className="inline-flex items-center gap-1.5 rounded border border-styler-line px-4 py-2.5 text-xs font-semibold text-styler-ink hover:bg-styler-surface-2 disabled:opacity-60">
            <ShieldCheck size={13} /> {busy === "password" ? "Updating..." : "Change password"}
          </button>
        </div>
      </form>

      <section className="rounded border border-styler-line bg-styler-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-styler-ink">Booking availability</h2>
            <p className="mt-1 text-[11px] leading-5 text-styler-muted">New customer requests are routed only after approval and while your studio is accepting bookings.</p>
          </div>
          <StatusPill status={profile?.applicationStatus || "draft"} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded border border-styler-line bg-styler-surface-2 p-3">
          <div>
            <p className="text-xs font-bold text-styler-ink">Accept booking requests</p>
            <p className="mt-0.5 text-[10px] text-styler-muted">Pause this at any time without changing your studio profile.</p>
          </div>
          <input type="checkbox" role="switch" checked={Boolean(availability?.acceptingRequests)} onChange={(event) => void toggle(event.target.checked)} disabled={busy !== "" || profile?.applicationStatus !== "approved"} aria-label="Accept booking requests" className="h-4 w-4 rounded border-styler-line text-styler-accent focus:ring-styler-accent disabled:opacity-50" />
        </div>
        {profile?.applicationStatus !== "approved" && <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">Request acceptance is available after your profile is approved.</p>}
        <p className="mt-3 text-[10px] leading-5 text-styler-muted">
          Requests with a customer pin require your service-location pin to fall inside the customer’s search radius.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            {
              label: "Verification",
              ready: profile?.applicationStatus === "approved",
              href: "/professional/profile",
              action: "View profile",
            },
            {
              label: "Service location",
              ready: Number.isFinite(profile?.baseLocation?.latitude) && Number.isFinite(profile?.baseLocation?.longitude),
              href: "/professional/profile",
              action: "Manage location",
            },
            {
              label: "Weekly availability",
              ready: Boolean(availability?.weeklySchedule?.length),
              href: "/professional/availability",
              action: "Set hours",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-styler-line bg-styler-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold text-styler-ink">
                <span className={`h-1.5 w-1.5 rounded-full ${item.ready ? "bg-emerald-500" : "bg-amber-500"}`} />
                {item.label}
              </p>
              <Link href={item.href} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-styler-accent hover:underline">
                {item.action} <ArrowRight size={11} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-styler-line bg-styler-surface p-5">
        <h2 className="text-sm font-bold text-styler-ink">Workspace shortcuts</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          { label: "Manage profile and service pin", href: "/professional/profile" },
          { label: "Manage services and pricing", href: "/professional/services" },
          { label: "Manage availability", href: "/professional/availability" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded border border-styler-line bg-styler-surface px-3 py-3 text-[10px] font-semibold text-styler-ink transition hover:border-styler-line-strong"
          >
            {item.label} <ArrowRight size={13} className="text-styler-accent" />
          </Link>
        ))}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. PROFESSIONAL PROFILE VIEW                                               */
/* -------------------------------------------------------------------------- */

export function ProfessionalProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ displayName: "", bio: "", profilePhoto: null as { url: string; fileId?: string } | null });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [ratingSummary, setRatingSummary] = useState<any>(null);
  const [ratingError, setRatingError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [authData, profileData] = await Promise.all([
          apiRequest<any>("/api/auth/me"),
          apiRequest<any>("/api/professional/application"),
        ]);
        if (!active) return;
        setUser(authData?.user || authData);
        setProfile(profileData);
        try {
          const reviewData = await apiRequest<any>("/api/professional/reviews?limit=1");
          if (active) setRatingSummary(reviewData?.summary || null);
        } catch (cause) {
          if (active) setRatingError(cause instanceof Error ? cause.message : "Could not load studio ratings.");
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load profile details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function saveServiceLocation() {
    setLocationBusy(true);
    setLocationError("");
    setLocationMessage("");
    try {
      const baseLocation = profile?.baseLocation;
      if (!Number.isFinite(baseLocation?.latitude) || !Number.isFinite(baseLocation?.longitude)) {
        throw new Error("Choose your studio location on the map or use current location first.");
      }
      const result = await apiRequest<any>("/api/professional/location", {
        method: "PATCH",
        body: JSON.stringify({
          latitude: baseLocation.latitude,
          longitude: baseLocation.longitude,
          city: profile?.city || "",
          state: profile?.state || "",
          postalCode: profile?.postalCode || "",
        }),
      });
      setProfile((current: any) => ({ ...current, ...result }));
      setLocationMessage("Service location saved. Nearby booking requests can now match your studio.");
    } catch (cause) {
      setLocationError(cause instanceof Error ? cause.message : "Could not save your service location.");
    } finally {
      setLocationBusy(false);
    }
  }

  function startEditingProfile() {
    setProfileDraft({
      displayName: profile?.displayName || user?.name || "",
      bio: profile?.bio || "",
      profilePhoto: profile?.profilePhoto?.url ? profile.profilePhoto : null,
    });
    setProfileError("");
    setProfileMessage("");
    setEditingProfile(true);
  }

  async function uploadStudioPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const uploaded = await uploadImageKit(file, "profile");
      setProfileDraft((current) => ({ ...current, profilePhoto: { url: uploaded.url, fileId: uploaded.fileId } }));
      setProfileMessage("Photo uploaded. Save your profile to publish it.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Could not upload your profile photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  }

  async function savePublicProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const result = await apiRequest<any>("/api/professional/public-profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: profileDraft.displayName,
          bio: profileDraft.bio,
          ...(profileDraft.profilePhoto ? { profilePhoto: profileDraft.profilePhoto } : {}),
        }),
      });
      setProfile((current: any) => ({ ...current, ...result }));
      setEditingProfile(false);
      setProfileMessage("Studio profile saved and updated for customers.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Could not save your studio profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading studio profile..." />;
  if (error && !profile) return <Alert tone="error">{error}</Alert>;

  const displayName = profile?.displayName || user?.name || "Name not set";
  const profilePhoto = profile?.profilePhoto?.url || user?.profileImageUrl;
  const portfolioImages = profile?.portfolioImages || [];
  const categories = profile?.categories || [];
  const documents = profile?.documents || [];
  const averageRating = ratingSummary?.averageRating == null ? "—" : Number(ratingSummary.averageRating).toFixed(1);
  const reviewCount = ratingSummary?.totalReviews ?? 0;
  const canEditPublicProfile = !["pending_review", "suspended"].includes(profile?.applicationStatus);
  const canContinueApplication = ["draft", "needs_changes", "rejected"].includes(profile?.applicationStatus);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-serif text-styler-ink mt-0.5">Professional Profile</h1>
          <p className="text-xs text-styler-muted ">How your studio profile appears to customers on Styler.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button type="button" onClick={startEditingProfile} disabled={!canEditPublicProfile} className="inline-flex items-center gap-1.5 rounded bg-styler-accent px-3.5 py-2 text-xs font-semibold text-white hover:bg-styler-accent-strong disabled:cursor-not-allowed disabled:opacity-50">
            <Pencil size={13} /> Edit studio profile
          </button>
          {canContinueApplication && <Link href="/professional/onboarding" className="inline-flex items-center gap-1.5 rounded border border-styler-line px-3.5 py-2 text-xs font-semibold text-styler-ink hover:bg-styler-surface-2"><Sparkles size={13} /> Continue setup</Link>}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {ratingError && <Alert tone="warning">{ratingError}</Alert>}
      {locationError && <Alert tone="error">{locationError}</Alert>}
      {locationMessage && <Alert tone="success">{locationMessage}</Alert>}
      {profileError && <Alert tone="error">{profileError}</Alert>}
      {profileMessage && <Alert tone="success">{profileMessage}</Alert>}

      {profile?.applicationStatus === "pending_review" && <Alert tone="warning">Your application is being reviewed. Studio profile edits will be available after the review is complete.</Alert>}

      {editingProfile && (
        <form onSubmit={savePublicProfile} className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-styler-ink">Edit public studio profile</h2>
              <p className="mt-1 text-[11px] leading-5 text-styler-muted">Update what customers see. Your verification documents and service details are not changed here.</p>
            </div>
            <button type="button" onClick={() => setEditingProfile(false)} aria-label="Close profile editor" className="rounded p-1.5 text-styler-muted hover:bg-styler-surface-2"><X size={16} /></button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-styler-ink">Studio display name
                <input value={profileDraft.displayName} onChange={(event) => setProfileDraft((draft) => ({ ...draft, displayName: event.target.value }))} required minLength={2} maxLength={120} className="mt-1.5 w-full rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" />
              </label>
              <label className="block text-xs font-semibold text-styler-ink">About your studio
                <textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((draft) => ({ ...draft, bio: event.target.value }))} rows={5} maxLength={3000} className="mt-1.5 w-full resize-y rounded border border-styler-line bg-styler-surface px-3 py-2.5 text-sm font-normal text-styler-ink outline-none focus:border-styler-accent" />
                <span className="mt-1 block text-right text-[10px] font-normal text-styler-muted">{profileDraft.bio.length}/3000</span>
              </label>
            </div>
            <div className="flex flex-col items-center justify-center rounded border border-styler-line bg-styler-surface-2 p-4">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-styler-line bg-styler-surface text-styler-accent">
                {profileDraft.profilePhoto?.url ? <img src={profileDraft.profilePhoto.url} alt="Studio profile preview" className="h-full w-full object-cover" /> : <UserRound size={32} />}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded border border-styler-line bg-styler-surface px-3 py-2 text-[11px] font-semibold text-styler-ink hover:bg-styler-surface-2">
                <Camera size={13} /> {uploadingPhoto ? "Uploading..." : "Change photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={uploadStudioPhoto} disabled={uploadingPhoto} />
              </label>
              <span className="mt-1 text-center text-[9px] text-styler-muted">Uploaded securely with ImageKit</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-styler-line pt-4">
            <button type="button" onClick={() => setEditingProfile(false)} className="rounded border border-styler-line px-3.5 py-2 text-xs font-semibold text-styler-ink hover:bg-styler-surface-2">Cancel</button>
            <button type="submit" disabled={savingProfile || uploadingPhoto} className="inline-flex items-center gap-1.5 rounded bg-styler-accent px-4 py-2 text-xs font-semibold text-white hover:bg-styler-accent-strong disabled:opacity-60">
              <Save size={13} /> {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 rounded border border-styler-line bg-styler-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-styler-ink">
              {profile?.baseLocation?.latitude != null && profile?.baseLocation?.longitude != null
                ? "Service location is set for radius-based matching."
                : "Set your service location to receive nearby booking requests."}
            </p>
            <p className="mt-1 text-[10px] text-styler-muted">
              Customers see your city, not your exact pin. Exact coordinates are used privately to route requests within the customer's search radius.
            </p>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[10px] text-styler-muted underline underline-offset-2"
            >
              © OpenStreetMap contributors
            </a>
          </div>
          {profile?.applicationStatus === "suspended" && (
            <span className="text-xs text-styler-muted">Contact Styler support to update a suspended account.</span>
          )}
        </div>
        <ProfessionalLocationEditor
          value={profile || {}}
          disabled={profile?.applicationStatus === "suspended"}
          onChange={(patch) => setProfile((current: any) => ({ ...current, ...patch }))}
        />
        <button
          type="button"
          onClick={saveServiceLocation}
          disabled={locationBusy || profile?.applicationStatus === "suspended"}
          className="inline-flex items-center justify-center gap-2 rounded bg-styler-accent px-3 py-2 text-xs font-semibold text-white hover:bg-styler-accent-strong disabled:opacity-60"
        >
          <LocateFixed size={14} />
          {locationBusy ? "Saving location..." : "Save service location"}
        </button>
      </div>

      {/* Main Profile Summary Card */}
      <div className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-styler-accent-soft text-styler-accent font-bold grid place-items-center ring-2 ring-styler-accent ">
            {profilePhoto ? (
              <img src={profilePhoto} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl">{displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-styler-ink ">{displayName}</h2>
              {profile?.applicationStatus === "approved" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                  <UserCheck size={10} /> Verified Studio
                </span>
              )}
              <StatusPill status={profile?.applicationStatus || "draft"} />
            </div>

            <p className="text-xs text-styler-muted flex items-center gap-1">
              <MapPin size={12} className="text-styler-muted" />
              {[profile?.city, profile?.state, profile?.postalCode].filter(Boolean).join(", ") || "Location not specified"}
            </p>
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-2 rounded bg-styler-surface-2 px-3.5 py-2 border border-styler-line ">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <div>
              <p className="text-xs font-bold text-styler-ink leading-tight">
                {averageRating}
              </p>
              <p className="text-[9px] text-styler-muted">
                {reviewCount === 1 ? "(1 review)" : `(${reviewCount} reviews)`}
              </p>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div className="pt-3 border-t border-styler-line ">
            <p className="text-[11px] font-semibold text-styler-ink-soft mb-1">About the Studio</p>
            <p className="text-xs text-styler-ink-soft leading-relaxed whitespace-pre-line">{profile.bio}</p>
          </div>
        )}
      </div>

      {/* Grid: Details & Services */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Experience & Details Card */}
        <div className="rounded border border-styler-line bg-styler-surface p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-styler-ink ">Studio Details</h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-styler-line ">
              <span className="text-styler-muted">Experience</span>
              <span className="font-semibold text-styler-ink ">{profile?.experienceYears || 0} Years</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-styler-line ">
              <span className="text-styler-muted">City</span>
              <span className="font-semibold text-styler-ink ">{profile?.city || "Not provided"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-styler-line ">
              <span className="text-styler-muted">Status</span>
              <StatusPill status={profile?.applicationStatus || "draft"} />
            </div>
          </div>
        </div>

        {/* Categories Offered */}
        <div className="rounded border border-styler-line bg-styler-surface p-5 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-styler-ink ">Categories Offered</h3>

          {categories.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((c: string) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded bg-styler-accent-soft px-3 py-1 text-[10px] font-semibold text-styler-accent border border-styler-line-strong "
                >
                  <Scissors size={11} /> {humanize(c)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-styler-muted pt-1">No categories selected yet.</p>
          )}
        </div>
      </div>

      {/* Portfolio Gallery Section */}
      <div className="rounded border border-styler-line bg-styler-surface p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-styler-accent" />
            <h3 className="text-xs font-bold text-styler-ink ">Portfolio Gallery</h3>
          </div>
          <span className="text-[10px] text-styler-muted">{portfolioImages.length} images</span>
        </div>

        {portfolioImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
            {portfolioImages.map((img: any, i: number) => (
              <div key={i} className="group relative h-28 overflow-hidden rounded bg-styler-surface-2 ">
                <img src={img.url} alt={`Portfolio ${i + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded bg-styler-surface-2 p-6 text-center">
            <Sparkles size={18} className="mx-auto text-styler-muted mb-1" />
            <p className="text-xs font-semibold text-styler-ink-soft ">No portfolio images uploaded</p>
            <p className="text-[10px] text-styler-muted mt-0.5">Upload photos of your work to show clients your skills.</p>
          </div>
        )}
      </div>

      {/* Verification Documents Status */}
      <div className="rounded border border-styler-line bg-styler-surface p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <h3 className="text-xs font-bold text-styler-ink ">Verification Status</h3>
          </div>
          <Link href="/professional/onboarding/documents" className="text-[10px] font-semibold text-styler-accent hover:underline">
            Manage Documents →
          </Link>
        </div>

        {documents.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 pt-1">
            {documents.map((d: any) => (
              <div key={d.documentType} className="flex items-center justify-between rounded-xl border border-styler-line p-3">
                <div className="flex items-center gap-2.5">
                  <FileCheck2 size={16} className="text-styler-accent" />
                  <div>
                    <p className="text-xs font-bold text-styler-ink ">{humanize(d.documentType)}</p>
                    <p className="text-[9px] text-styler-muted truncate max-w-[150px]">{d.originalFileName || "Uploaded file"}</p>
                  </div>
                </div>
                <StatusPill status={d.status || "pending"} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-styler-muted">No verification documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. PROFESSIONAL REVIEWS & FEEDBACK                                        */
/* -------------------------------------------------------------------------- */

export function ProfessionalReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<any>(`/api/professional/reviews?limit=50&page=${page}`);
        if (!active) return;
        setReviews(unwrapItems(data));
        setSummary(data?.summary || null);
        setTotalPages(Math.max(1, Number(data?.totalPages) || 1));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load customer reviews.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [page]);

  const averageRating = summary?.averageRating == null ? null : Number(summary.averageRating).toFixed(1);
  const totalReviews = summary?.totalReviews ?? reviews.length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-serif text-styler-ink mt-0.5">Reviews & Ratings</h1>
          <p className="text-xs text-styler-muted ">Feedback and ratings shared by your clients after completed bookings.</p>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock label="Loading reviews..." />
      ) : (
        <>
          {/* Summary Rating Card */}
          <div className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/50 dark:border-amber-800/40">
                <Star size={28} fill="currentColor" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-styler-ink ">{averageRating ?? "—"}</span>
                  <span className="text-xs text-styler-muted font-medium">out of 5.0</span>
                </div>
                <p className="text-xs text-styler-muted ">Based on {totalReviews} verified client reviews</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  className={averageRating !== null && star <= Math.round(Number(averageRating)) ? "text-amber-400 fill-amber-400" : "text-slate-200 "}
                />
              ))}
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review._id || review.id} className="rounded border border-styler-line bg-styler-surface p-4.5 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-styler-accent-soft text-styler-accent font-bold text-xs grid place-items-center">
                        {(review.customerName || "C").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-styler-ink leading-tight">{review.customerName || "Customer"}</p>
                        <p className="text-[10px] text-styler-muted">{review.serviceTitle || "Service"} · {dateTime(review.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          className={star <= Number(review.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-200 "}
                        />
                      ))}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-xs text-styler-ink-soft leading-relaxed pl-1">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded border border-styler-line bg-styler-surface p-8 text-center ">
              <Star size={24} className="mx-auto text-styler-muted mb-2" />
              <p className="text-xs font-bold text-styler-ink ">No reviews yet</p>
              <p className="text-[10px] text-styler-muted mt-1">Reviews from completed customer appointments will appear here.</p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-styler-line pt-3 ">
              <span className="text-[10px] text-styler-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1 || loading} className="rounded-lg border border-styler-line px-3 py-1.5 text-[10px] text-styler-ink-soft disabled:opacity-50 ">Previous</button>
                <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading} className="rounded-lg border border-styler-line px-3 py-1.5 text-[10px] text-styler-ink-soft disabled:opacity-50 ">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. PROFESSIONAL PORTFOLIO MANAGEMENT                                       */
/* -------------------------------------------------------------------------- */

export function ProfessionalPortfolio() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const appData = await apiRequest<any>("/api/professional/application");
        if (!active) return;
        setImages(appData?.portfolioImages || []);
        setApplicationStatus(appData?.applicationStatus || "");
        setLoaded(true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load portfolio images.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 40 - images.length;
    if (remaining <= 0) {
      setError("Your portfolio already has the maximum of 40 images.");
      e.target.value = "";
      return;
    }
    const filesToUpload = files.slice(0, Math.min(8, remaining));

    setUploading(true);
    setError("");
    setNotice("");
    const uploadedList: any[] = [];

    try {
      for (const file of filesToUpload) {
        const data = await uploadImageKit(file, "portfolio");
        uploadedList.push({
          url: data.url,
          fileId: data.fileId,
          altText: file.name,
          sortOrder: images.length + uploadedList.length,
        });
      }

      const updated = [...images, ...uploadedList];
      setImages(updated);
      const skipped = files.length - filesToUpload.length;
      setNotice(`${uploadedList.length} image(s) added.${skipped ? ` ${skipped} file(s) skipped due to upload or portfolio limits.` : ""} Click "Save Portfolio" to apply changes.`);
    } catch (cause) {
      if (uploadedList.length) {
        setImages((current) => [...current, ...uploadedList]);
        setNotice(`${uploadedList.length} image(s) uploaded before the error. Save your portfolio to keep them.`);
      }
      setError(cause instanceof Error ? cause.message : "Failed to upload portfolio images.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    setNotice("Image removed. Click 'Save Portfolio' to apply changes.");
  }

  async function savePortfolio() {
    if (!loaded || ["approved", "pending_review", "suspended"].includes(applicationStatus)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/professional/application", {
        method: "PATCH",
        body: JSON.stringify({ portfolioImages: images }),
      });
      setNotice("Portfolio images saved successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save portfolio.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-serif text-styler-ink mt-0.5">Portfolio Showcase</h1>
          <p className="text-xs text-styler-muted ">Upload high-resolution images of your finest work to attract more clients.</p>
        </div>

        <button
          type="button"
          onClick={savePortfolio}
          disabled={saving || loading || !loaded || ["approved", "pending_review", "suspended"].includes(applicationStatus)}
          className="inline-flex items-center gap-1.5 rounded bg-styler-accent px-4 py-2 text-xs font-semibold text-white hover:bg-styler-accent transition disabled:opacity-50 self-start sm:self-auto shadow-2xs"
        >
          <Save size={14} /> {saving ? "Saving..." : "Save Portfolio"}
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="warning">{notice}</Alert>}
      {loaded && ["approved", "pending_review", "suspended"].includes(applicationStatus) && (
        <Alert tone="warning">Portfolio edits are unavailable while your application is {humanize(applicationStatus).toLowerCase()}.</Alert>
      )}

      {loading ? (
        <LoadingBlock label="Loading portfolio gallery..." />
      ) : (
        <div className="rounded border border-styler-line bg-styler-surface p-5 sm:p-6 shadow-2xs space-y-4">
          {/* Upload Dropzone */}
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-styler-line p-8 hover:bg-styler-surface-2 transition">
            <ImagePlus size={28} className="text-styler-accent mb-2" />
            <p className="text-xs font-bold text-styler-ink ">
              {uploading ? "Uploading images..." : "Click or drag to upload portfolio images"}
            </p>
            <p className="text-[10px] text-styler-muted mt-0.5">JPG, PNG or WEBP (Max 8 MB per file)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleUpload}
              disabled={uploading || !loaded || ["approved", "pending_review", "suspended"].includes(applicationStatus) || images.length >= 40}
              className="hidden"
            />
          </label>

          {/* Portfolio Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-styler-ink ">Uploaded Photos ({images.length})</h2>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, index) => (
                  <div key={img.fileId || img.url || index} className="group relative h-36 overflow-hidden rounded bg-styler-surface-2 border border-styler-line ">
                    <img src={img.url} alt={img.altText || `Portfolio ${index + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 rounded bg-slate-950/80 p-1 text-white opacity-0 group-hover:opacity-100 transition hover:bg-styler-accent"
                      aria-label="Remove image"
                      disabled={["approved", "pending_review", "suspended"].includes(applicationStatus)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-styler-surface-2 p-6 text-center">
                <p className="text-xs text-styler-muted ">No images uploaded yet. Upload your first photo above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}