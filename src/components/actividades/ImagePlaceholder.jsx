export default function ImagePlaceholder({ height = 220, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${className}`}
      style={{
        height,
        background:
          "linear-gradient(135deg, #bb9c82 0%, #e48d40 52%, #db700f 100%)",
      }}
    />
  );
}
