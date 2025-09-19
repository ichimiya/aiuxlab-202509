// @vitest-environment jsdom

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResearchDetailView } from "../ResearchDetailView";
import type { ResearchDetailState } from "@/shared/stores/researchDetailStore";
import type { ResearchSnapshot } from "@/shared/useCases/ports/research";

const connectMock = vi.fn();
const disconnectMock = vi.fn();
const reconnectMock = vi.fn();
const applyEventMock = vi.fn();

const baseSnapshot: ResearchSnapshot = {
  id: "research-uuid",
  query: "Redis Streams",
  status: "pending",
  revision: 1,
  results: [],
  searchResults: [],
  citations: [],
  createdAt: "2025-09-18T10:00:00.000Z",
  updatedAt: "2025-09-18T10:00:00.000Z",
  lastError: null,
};

const state: ResearchDetailState = {
  snapshots: { [baseSnapshot.id]: baseSnapshot },
  connections: {
    [baseSnapshot.id]: {
      status: "open",
      lastEventId: 1,
    },
  },
  connect: connectMock,
  reconnect: reconnectMock,
  disconnect: disconnectMock,
  applyEvent: applyEventMock,
};

vi.mock("@/shared/stores/researchDetailStore", () => ({
  useResearchDetailStore: vi.fn(
    (selector: (state: ResearchDetailState) => unknown) => selector(state),
  ),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("ResearchDetailView", () => {
  beforeEach(() => {
    connectMock.mockReset();
    disconnectMock.mockReset();
    reconnectMock.mockReset();
    applyEventMock.mockReset();
    state.snapshots[baseSnapshot.id] = { ...baseSnapshot };
    state.connections[baseSnapshot.id] = {
      status: "open",
      lastEventId: 1,
    };
    connectMock.mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("mount時にconnectを呼び出し、アンマウントでdisconnectする", () => {
    const { unmount } = render(<ResearchDetailView id="research-uuid" />);
    expect(connectMock).toHaveBeenCalledWith("research-uuid");

    unmount();
    expect(disconnectMock).toHaveBeenCalledWith("research-uuid");
  });

  it("スナップショット情報と結果を表示する", () => {
    state.snapshots[baseSnapshot.id] = {
      ...baseSnapshot,
      status: "completed",
      results: [
        {
          id: "result-1",
          content: "Redis Streams allow fan-out",
          source: "perplexity",
          relevanceScore: 1,
        },
      ],
      searchResults: [
        {
          id: "search-1",
          title: "Redis Streams Overview",
          url: "https://redis.io",
          snippet: "Redis Streams provide append-only log...",
        } as ResearchSnapshot["searchResults"][number],
      ],
    } as ResearchSnapshot;

    render(<ResearchDetailView id="research-uuid" />);

    expect(screen.getByText("Redis Streams allow fan-out")).toBeInTheDocument();
    expect(screen.getByText("Redis Streams Overview")).toBeInTheDocument();
    expect(screen.getByText(/ステータス: 完了/)).toBeInTheDocument();
  });

  it("追いリサーチボタンでAPIを呼び出し、再接続する", async () => {
    render(<ResearchDetailView id="research-uuid" />);

    fireEvent.click(screen.getByRole("button", { name: "追いリサーチ" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/research/research-uuid/re-execute",
        { method: "POST" },
      );
    });

    expect(reconnectMock).toHaveBeenCalledWith("research-uuid");
  });

  it("SSEエラーが発生した場合、エラーメッセージを表示する", () => {
    state.connections[baseSnapshot.id] = {
      status: "error",
      lastEventId: 1,
      error: "SSE connection lost",
    };

    render(<ResearchDetailView id="research-uuid" />);

    expect(
      screen.getByText("SSE接続に問題が発生しました: SSE connection lost"),
    ).toBeInTheDocument();
  });
});
