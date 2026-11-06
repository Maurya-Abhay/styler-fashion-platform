"use client";

type CategoryImageProps = {
  src: string;
  alt: string;
  className?: string;
};

const FALLBACK_IMAGE = "/images/hero-desktop.webp";

export function CategoryImage({ src, alt, className }: CategoryImageProps) {
  return (
    <img
      src={src || FALLBACK_IMAGE}
      alt={alt}
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = FALLBACK_IMAGE;
      }}
      className={className}
    />
  );
}
