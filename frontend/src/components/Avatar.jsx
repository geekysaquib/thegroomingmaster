/** Round profile picture; falls back to the user's initials on a gold circle. */
export default function Avatar({ user, size = 32, className = "" }) {
  const initials = (user?.name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (user?.avatar) return <img src={user.avatar} alt={`${user.name}'s profile`} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
  return <span style={style} aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground ${className}`}>{initials}</span>;
}
