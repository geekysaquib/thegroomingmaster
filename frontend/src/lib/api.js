import axios from "axios";

const TOKEN_KEY = "gm_token";

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

export const api = axios.create({ baseURL: "/api" });

// Number of API calls currently in flight; the global loader subscribes to it.
let pending = 0;
const listeners = new Set();
const setPending = (delta) => { pending = Math.max(0, pending + delta); listeners.forEach((l) => l()); };
export const pendingRequests = {
  subscribe: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
  getSnapshot: () => pending,
};

api.interceptors.request.use((config) => {
  setPending(1);
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
}, (err) => { setPending(-1); return Promise.reject(err); });

api.interceptors.response.use(
  (r) => { setPending(-1); return r; },
  (err) => {
    setPending(-1);
    // Expired/invalid session on an authenticated call: drop it and let the auth context redirect.
    if (err.response?.status === 401 && tokenStore.get() && !err.config.url.startsWith("/auth/login")) {
      tokenStore.clear();
      window.dispatchEvent(new Event("gm:logout"));
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e.response?.data?.error || e.message || "Something went wrong";

/** Fetches a protected file (PDF/CSV) with the auth header and opens or saves it. */
export async function openFile(url, { download } = {}) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data);
  if (download) {
    const a = document.createElement("a");
    a.href = blobUrl; a.download = download; a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    window.open(blobUrl, "_blank");
  }
}
