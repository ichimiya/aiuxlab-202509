const researchContentClasses = [
  "prose",
  "prose-sm",
  "prose-invert",
  "max-w-none",
  "leading-relaxed",
  "prose-headings:font-semibold",
  "prose-headings:text-sky-200",
  "prose-a:text-sky-300",
  "prose-a:underline",
  "prose-a:underline-offset-4",
  "prose-strong:text-sky-100",
  "prose-blockquote:border-sky-500/40",
  "prose-blockquote:text-sky-100",
  "prose-hr:border-slate-700",
  "prose-li:marker:text-sky-400",
] as const;

export function getResearchContentClassName(): string {
  return researchContentClasses.join(" ");
}
