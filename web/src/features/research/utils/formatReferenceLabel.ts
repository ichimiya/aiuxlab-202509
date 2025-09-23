export function formatReferenceLabel(index: number): string {
  const normalized = Number.isFinite(index)
    ? Math.max(0, Math.floor(index))
    : 0;
  const displayNumber = normalized + 1;
  const padded = displayNumber.toString().padStart(3, "0");
  return `REF. ${padded}`;
}
