export function excerpt(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !/^\s*\|/.test(line))
    .map((line) => line.replace(/^\s*(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s*)/, ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
