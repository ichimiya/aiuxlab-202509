import type { ResearchSnapshot } from "@/shared/useCases/ports/research";

type MetadataTone = "success" | "warning" | "danger" | "info";

export interface ResearchMetadataItem {
  key: string;
  label: string;
  value: string;
  tone?: MetadataTone;
}

export interface ResearchMetadata {
  query: string | null;
  items: ResearchMetadataItem[];
}

const STATUS_DISPLAY_LABEL: Record<string, string> = {
  pending: "In Progress",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_TONE: Record<string, MetadataTone> = {
  pending: "warning",
  completed: "success",
  failed: "danger",
};

function formatStatus(status?: string) {
  if (!status) {
    return { label: "-", tone: "info" as MetadataTone };
  }

  const normalized = status.toLowerCase();
  const label = STATUS_DISPLAY_LABEL[normalized] ?? capitalize(normalized);
  const tone = STATUS_TONE[normalized] ?? "info";

  return { label, tone };
}

function capitalize(value: string) {
  if (!value) return value;
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

interface BuildResearchMetadataParams {
  id: string;
  snapshot?: ResearchSnapshot;
  formatDate: (value?: string) => string;
}

export function buildResearchMetadata({
  id,
  snapshot,
  formatDate,
}: BuildResearchMetadataParams): ResearchMetadata {
  const { label: statusLabel, tone: statusTone } = formatStatus(
    snapshot?.status,
  );

  return {
    query: snapshot?.query ?? null,
    items: [
      { key: "researchId", label: "Research ID", value: id },
      {
        key: "status",
        label: "Status",
        value: statusLabel,
        tone: statusTone,
      },
      {
        key: "revision",
        label: "Revision",
        value:
          typeof snapshot?.revision === "number" &&
          Number.isFinite(snapshot.revision)
            ? String(snapshot.revision)
            : "-",
      },
      {
        key: "createdAt",
        label: "Created",
        value: formatDate(snapshot?.createdAt),
      },
      {
        key: "updatedAt",
        label: "Updated",
        value: formatDate(snapshot?.updatedAt),
      },
    ],
  };
}
