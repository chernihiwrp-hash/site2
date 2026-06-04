import React from "react";

export function isImageSrc(v?: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  if (!s) return false;
  if (/^(https?:)?\/\//i.test(s)) return true;
  if (s.startsWith("/")) return true;
  if (s.startsWith("data:image")) return true;
  if (/\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i.test(s)) return true;
  return false;
}

type Props = {
  value?: string | null;
  size?: number;
  className?: string;
  imgClassName?: string;
  fallback?: React.ReactNode;
  alt?: string;
};

export default function CookIcon({
  value, size = 28, className, imgClassName, fallback = null, alt = "",
}: Props) {
  if (!value) return <>{fallback}</>;
  if (isImageSrc(value)) {
    return (
      <img
        src={value}
        alt={alt}
        loading="lazy"
        draggable={false}
        style={{ width: size, height: size, objectFit: "contain" }}
        className={"inline-block rounded-md select-none " + (imgClassName || "")}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return <span className={className}>{value}</span>;
}
