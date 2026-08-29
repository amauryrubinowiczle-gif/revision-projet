/** Génère un UUID v4 — disponible nativement dans la webview Tauri (Web Crypto API) et en Node (tests). */
export function generateId(): string {
  return crypto.randomUUID();
}
