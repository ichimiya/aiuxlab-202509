import { describe, it, expect } from "vitest";
import { ResearchDomainService } from "./services";
import type { ContentProcessingPort } from "@/shared/useCases/ports/contentProcessing";

describe("ResearchDomainService - Port注入（Red）", () => {
  it("ContentProcessingPortの構造化出力をそのまま利用してHTMLと引用を設定する", async () => {
    const port: ContentProcessingPort = {
      async process(input) {
        return {
          htmlContent: `<section><h1>H</h1><p>${input.markdown}</p></section>`,
          processedCitations: [
            {
              id: "ref1",
              number: 1,
              url: input.citations[0] || "https://example.com",
            },
          ],
        };
      },
    };

    const svc = new ResearchDomainService(port);
    const result = await svc.processContent(
      "Hello [1]",
      ["https://example.com"],
      [{ title: "ex", url: "https://example.com" }],
    );

    expect(result.htmlContent).toContain("<section>");
    expect(result.processedCitations[0]?.id).toBe("ref1");
  });
});
