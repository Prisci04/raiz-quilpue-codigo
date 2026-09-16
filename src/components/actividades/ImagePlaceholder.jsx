export default function ImagePlaceholder({ height = 220, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${className}`}
      style={{
        height,
        background:
          "linear-gradient(135deg, #d7c4ae 0%, #b45a3c 52%, #8a6f5c 100%)",
      }}
    />
  );
}
