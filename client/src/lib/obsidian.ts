export function openInObsidian(obsidianPath: string) {
  window.location.href = `obsidian://open?path=${encodeURIComponent(obsidianPath)}`;
}
