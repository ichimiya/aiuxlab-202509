import { randomUUID } from "node:crypto";
import type { ResearchIdGeneratorPort } from "@/shared/useCases/ports/research";

export function createResearchIdGenerator(): ResearchIdGeneratorPort {
  return {
    generate() {
      if (typeof randomUUID === "function") {
        return randomUUID();
      }
      // Fallback for environments without crypto.randomUUID
      return "research-" + Math.random().toString(36).slice(2, 10);
    },
  };
}
