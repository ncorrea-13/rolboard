interface AndroidBridge {
  request(
    id: string,
    method: string,
    path: string,
    contentType: string,
    bodyBase64: string,
  ): void;
  openExternal(url: string): void;
  settings(): string;
  pickFolder(id: string, kind: string): void;
}

interface BridgeResult {
  id: string;
  status: number;
  contentType: string;
  body: string;
}

declare global {
  interface Window {
    RolboardAndroid?: AndroidBridge;
    __rolboardResolve?: (result: BridgeResult) => void;
  }
}

const pending = new Map<string, (result: BridgeResult) => void>();
let nextId = 0;

window.__rolboardResolve = (result) => {
  pending.get(result.id)?.(result);
  pending.delete(result.id);
};

export function androidBridge(): AndroidBridge | undefined {
  return window.RolboardAndroid;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function bridgeFetch(
  bridge: AndroidBridge,
  url: string,
  init: RequestInit,
): Promise<Response> {
  let body = new Uint8Array();
  if (typeof init.body === "string") body = new TextEncoder().encode(init.body);
  else if (init.body instanceof ArrayBuffer) body = new Uint8Array(init.body);
  const contentType = new Headers(init.headers).get("Content-Type") ?? "";
  const id = String(nextId++);
  const result = await new Promise<BridgeResult>((resolve) => {
    pending.set(id, resolve);
    bridge.request(id, init.method ?? "GET", url, contentType, toBase64(body));
  });
  if (result.status === 0) throw new TypeError(atob(result.body));
  const empty = [204, 205, 304].includes(result.status);
  return new Response(empty ? null : fromBase64(result.body), {
    status: result.status,
    headers: { "Content-Type": result.contentType },
  });
}

export function pickFolder(
  bridge: AndroidBridge,
  kind: string,
): Promise<{ status: number; text: string }> {
  const id = String(nextId++);
  return new Promise((resolve) => {
    pending.set(id, (result) =>
      resolve({
        status: result.status,
        text: new TextDecoder().decode(fromBase64(result.body)),
      }),
    );
    bridge.pickFolder(id, kind);
  });
}

export function send(url: string, init: RequestInit = {}): Promise<Response> {
  const bridge = androidBridge();
  if (bridge && (init.method ?? "GET") !== "GET") {
    return bridgeFetch(bridge, url, init);
  }
  return fetch(url, init);
}
