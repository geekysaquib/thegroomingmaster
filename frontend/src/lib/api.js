import axios from "axios";

const TOKEN_KEY = "gm_token";

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage blocked */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
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
