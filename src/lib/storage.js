export const STORAGE_KEY = "demandlab.workspace.v1";

export const createId = (prefix = "item") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function loadWorkspace() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...workspace, version: 1, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspace() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadTextFile(fileName, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportWorkspace(workspace) {
  downloadTextFile(`demandlab-workspace-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(workspace, null, 2));
}

export async function importWorkspace(file) {
  const parsed = JSON.parse(await file.text());
  if (!parsed || !Array.isArray(parsed.projects)) throw new Error("This is not a valid DemandLab workspace backup.");
  return { ...parsed, version: 1 };
}
