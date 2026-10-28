// Callers keep their existing state conditions and labels.
export default function AdminBadge({ tone = "neutral", children }) {
  return <span className={`admin-badge admin-badge-${tone}`}>{children}</span>;
}
