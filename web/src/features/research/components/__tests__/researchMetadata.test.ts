import { describe, it, expect } from "vitest";
import type { ResearchSnapshot } from "@/shared/useCases/ports/research";
import { buildResearchMetadata } from "../researchMetadata";

describe("buildResearchMetadata", () => {
  const snapshot: ResearchSnapshot = {
    id: "research-uuid",
    query: "What is Redis Streams?",
    status: "completed",
    revision: 3,
    results: [],
    searchResults: [],
    citations: [],
    createdAt: "2025-09-18T10:00:00.000Z",
    updatedAt: "2025-09-18T12:00:00.000Z",
    lastError: null,
  };

  it("指定されたスナップショットから英語ラベルのメタデータを生成する", () => {
    const metadata = buildResearchMetadata({
      id: snapshot.id,
      snapshot,
      formatDate: (value?: string) => (value ? `formatted:${value}` : "-"),
    });

    expect(metadata.query).toBe("What is Redis Streams?");
    expect(metadata.items).toMatchObject([
      { key: "researchId", label: "Research ID", value: "research-uuid" },
      { key: "status", label: "Status", value: "Completed", tone: "success" },
      { key: "revision", label: "Revision", value: "3" },
      {
        key: "createdAt",
        label: "Created",
        value: "formatted:2025-09-18T10:00:00.000Z",
      },
      {
        key: "updatedAt",
        label: "Updated",
        value: "formatted:2025-09-18T12:00:00.000Z",
      },
    ]);
  });

  it("スナップショットが未取得の場合でもIDのみでメタデータを返す", () => {
    const metadata = buildResearchMetadata({
      id: "research-uuid",
      snapshot: undefined,
      formatDate: () => "-",
    });

    expect(metadata.query).toBeNull();
    expect(metadata.items).toEqual([
      { key: "researchId", label: "Research ID", value: "research-uuid" },
      { key: "status", label: "Status", value: "-", tone: "info" },
      { key: "revision", label: "Revision", value: "-" },
      { key: "createdAt", label: "Created", value: "-" },
      { key: "updatedAt", label: "Updated", value: "-" },
    ]);
  });
});
