import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileIcon } from "@/app/components/icons";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import { checkDocumentStorage } from "@/app/actions/documents";
import { DocumentList } from "./components/document-list";

interface DocumentRow {
  id: string;
  original_filename: string;
  mime_type: string | null;
  byte_size: number | null;
  document_type: string | null;
  classification: string;
  description: string | null;
  created_at: string;
  storage_path: string | null;
  uploaded_by: string | null;
  user_profiles: { display_name: string | null } | null;
}

function normalizeDocument(document: unknown): DocumentRow {
  const row = document as Record<string, unknown>;
  const profiles = row.user_profiles;
  const profileList = Array.isArray(profiles)
    ? profiles
    : profiles && typeof profiles === "object"
      ? [profiles]
      : [];
  const profile = profileList[0] as Record<string, unknown> | undefined;

  return {
    id: row.id as string,
    original_filename: row.original_filename as string,
    mime_type: row.mime_type as string | null,
    byte_size: row.byte_size as number | null,
    document_type: row.document_type as string | null,
    classification: (row.classification as string) ?? "confidential",
    description: row.description as string | null,
    created_at: row.created_at as string,
    storage_path: row.storage_path as string | null,
    uploaded_by: row.uploaded_by as string | null,
    user_profiles: profile
      ? {
          display_name: (
            (profile.display_name as string | null) ?? null
          ),
        }
      : null,
  };
}

async function CheckingLibrary() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-workspace px-4">
      <p role="status" className="text-sm font-medium text-muted">Loading your documents…</p>
    </main>
  );
}

async function DocumentsLibrary({
  access,
  searchParams,
}: {
  access: { userId: string | null; workspaceId: string | null; role: string | null };
  searchParams: { uploaded?: string | null };
}) {
  const supabase = await createClient();
  const uploadComplete = searchParams.uploaded === "1";

  const storageResult = await checkDocumentStorage();
  const storageConfigured = storageResult.ok === true;

  const { data: rawDocuments, error } = await supabase
    .from("documents")
    .select(
      "id, original_filename, mime_type, byte_size, document_type, classification, description, created_at, storage_path, uploaded_by, user_profiles(display_name)",
    )
    .eq("workspace_id", access.workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
            <FileIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-charcoal">Documents</h1>
            <p className="text-sm text-muted">Store and manage commercial records.</p>
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <p className="text-sm text-red-800">
            Could not load documents: {error.message || "An unexpected error occurred."}
          </p>
          <Link
            href="/documents"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
          >
            Try again
          </Link>
        </div>
        <Link
          href="/documents/new"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
        >
          <FileIcon className="h-4 w-4" />
          Upload a Document
        </Link>
      </div>
  );
  }

  const documents = (rawDocuments ?? []).map(normalizeDocument);
  const canManage =
    access.role === "owner" || access.role === "admin" || access.role === "manager";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <FileIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Documents</h1>
          <p className="text-sm text-muted">Store and manage commercial records.</p>
        </div>
      </div>

      {uploadComplete && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
          <p className="text-sm text-green-800" role="status">
            Your document was uploaded successfully.
          </p>
        </div>
      )}

      {!storageConfigured && canManage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">
            Document storage is not configured
          </h2>
          <p className="mb-3 text-sm text-amber-700">
            Uploads and downloads will fail until a platform administrator creates the private storage bucket{" "}
            <code className="font-mono text-xs">workspace-documents</code> in Supabase Storage.
          </p>
          <p className="text-sm text-amber-700">See the deployment notes for the required bucket and storage policies.</p>
        </div>
      )}

      <Suspense fallback={<CheckingLibrary />}>
        <DocumentList documents={documents} canManage={canManage} storageConfigured={storageConfigured} />
      </Suspense>

      <div className="border-t border-border pt-6">
        <Link
          href="/documents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-800"
        >
          <FileIcon className="h-4 w-4" />
          Upload a Document
        </Link>
      </div>
    </div>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const supabase = await createClient();
  const access = await getWorkspaceAccess(supabase);

  if (access.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (access.status !== "allowed") {
    redirect("/access-denied");
  }

  return (
    <DocumentsLibrary
      access={{
        userId: access.userId ?? null,
        workspaceId: access.workspaceId ?? null,
        role: access.role ?? null,
      }}
      searchParams={{
        uploaded: (params.uploaded as string) ?? null,
      }}
    />
  );
}

