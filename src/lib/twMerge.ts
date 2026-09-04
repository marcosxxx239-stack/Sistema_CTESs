// Simple class name utility — joins truthy classes and deduplicates.
export function twMerge(input: string): string {
  return Array.from(new Set(input.split(/\s+/).filter(Boolean))).join(" ");
}
