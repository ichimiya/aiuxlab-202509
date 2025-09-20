import type { SystemClockPort } from "@/shared/useCases/ports/research";

export function createSystemClock(): SystemClockPort {
  return {
    now() {
      return new Date().toISOString();
    },
  };
}
