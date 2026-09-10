export function openInObsidian(vaultName: string, obsidianPath: string) {
  const file = obsidianPath.replace(/\.md$/, "");
  window.location.href = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file)}`;
}
