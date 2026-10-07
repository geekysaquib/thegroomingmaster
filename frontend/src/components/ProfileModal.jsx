import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";
import { Button, ErrorNote, Field, Input, Modal } from "./ui";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error("Couldn't read that file."));
  r.readAsDataURL(file);
});

/** Edit own profile: picture (base64, <= 2 MB), name and phone. Works for customers, staff and admin. */
export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [avatar, setAvatar] = useState(user.avatar || null); // data URL, or null = no picture
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setError("");
    if (!TYPES.includes(file.type)) return setError("Please choose a PNG, JPG, GIF or WebP image.");
    if (file.size > MAX_AVATAR_BYTES) return setError(`That image is ${(file.size / 1048576).toFixed(1)} MB. The limit is 2 MB.`);
    try { setAvatar(await readAsDataUrl(file)); } catch (err) { setError(err.message); }
  };

  const save = async (e) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const body = { name, phone };
      if (avatar !== (user.avatar || null)) body.avatar = avatar; // only send the picture if it changed
      const { data } = await api.patch("/auth/me", body);
      updateUser(data); onClose();
    } catch (err) { setError(errMsg(err)); setBusy(false); }
  };

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <ErrorNote>{error}</ErrorNote>
        <div className="flex items-center gap-4">
          <Avatar user={{ name, avatar }} size={80} />
          <div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Camera size={14} /> {avatar ? "Change picture" : "Upload picture"}</Button>
              {avatar && <Button type="button" variant="ghost" size="sm" onClick={() => setAvatar(null)}><Trash2 size={14} /> Remove</Button>}
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">PNG, JPG, GIF or WebP. Max 2 MB.</p>
            <input ref={fileRef} type="file" accept={TYPES.join(",")} onChange={pick} className="sr-only" aria-label="Choose profile picture" tabIndex={-1} />
          </div>
        </div>
        <Field label="Full name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Phone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Email"><Input value={user.email || ""} disabled /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}
