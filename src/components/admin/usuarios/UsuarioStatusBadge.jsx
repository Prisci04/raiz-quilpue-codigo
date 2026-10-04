const TONES = {
  activo: "bg-[#e7efd8] text-[#3f4c28]",
  inactivo: "bg-[#f6e4dc] text-[#8d3b28]",
};

const LABELS = {
  activo: "Activo",
  inactivo: "Inactivo",
};

export default function UsuarioStatusBadge({ estado }) {
  const tone = TONES[estado] ?? "bg-[#2c1810]/8 text-[#7c5c47]";
  const label = LABELS[estado] ?? estado;

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-md px-2 text-[11px] font-medium tracking-[0.12em] uppercase ${tone}`}
    >
      {label}
    </span>
  );
}
