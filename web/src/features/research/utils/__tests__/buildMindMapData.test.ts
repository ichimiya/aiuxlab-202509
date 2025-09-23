import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import type { ResearchResultSnapshot } from "@/shared/useCases/ports/research";
import { buildMindMapFromResults } from "../mindMap";

type DOMParserConstructor = new () => {
  parseFromString(html: string, type: string): Document;
};

beforeAll(() => {
  (globalThis as unknown as { DOMParser: DOMParserConstructor }).DOMParser =
    class {
      parseFromString(html: string, _type: string) {
        return new JSDOM(html).window.document;
      }
    };
});

afterAll(() => {
  delete (globalThis as { DOMParser?: unknown }).DOMParser;
});

describe("buildMindMapFromResults", () => {
  const basicResult: ResearchResultSnapshot = {
    id: "res-1",
    content: "",
    htmlContent: `
      <article>
        <h1>AI Research</h1>
        <section>
          <h2>Overview</h2>
          <p>AI is evolving rapidly.</p>
        </section>
        <section>
          <h2>Applications</h2>
          <ul>
            <li>Healthcare</li>
            <li>Finance</li>
          </ul>
        </section>
      </article>
    `,
    source: "https://example.com/source",
    relevanceScore: 0.9,
  };

  it("結果HTMLをマインドマップ構造に変換する", () => {
    const nodes = buildMindMapFromResults([basicResult]);

    expect(nodes).toHaveLength(1);

    const root = nodes[0];
    expect(root.label).toBe("AI Research");
    expect(root.domPath).toEqual([]);
    expect(root.children.map((child) => child.label)).toEqual([
      "Overview",
      "Applications",
    ]);
    expect(root.children.map((child) => child.domPath)).toEqual([
      [0, 1],
      [0, 2],
    ]);

    const overview = root.children.find((child) => child.label === "Overview");
    expect(overview).toBeDefined();
    expect(overview?.children.map((child) => child.label)).toEqual([
      "AI is evolving rapidly.",
    ]);

    const applications = root.children.find(
      (child) => child.label === "Applications",
    );
    expect(applications).toBeDefined();
    expect(applications?.children.map((child) => child.label)).toEqual([
      "Healthcare",
      "Finance",
    ]);
    expect(applications?.children.map((child) => child.domPath)).toEqual([
      [0, 2, 1, 0],
      [0, 2, 1, 1],
    ]);
  });

  it("htmlContentが空の場合は空配列を返す", () => {
    const emptyResult: ResearchResultSnapshot = {
      ...basicResult,
      id: "res-empty",
      htmlContent: "",
    };

    expect(buildMindMapFromResults([emptyResult])).toEqual([]);
  });
});
