"use client";

import Image from "next/image";

const UNSPLASH = "images.unsplash.com";

export function ProductPhoto({
  src,
  alt,
  gradient,
  sizes,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  gradient: string;
  sizes: string;
  priority?: boolean;
}) {
  const unsplash = Boolean(src && src.includes(UNSPLASH));

  if (unsplash && src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={80}
        style={{ objectFit: "cover" }}
      />
    );
  }

  if (src) {
    return (
      // Non-Unsplash fallback (e.g. leftover picsum URLs on an old database).
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    );
  }

  return <div style={{ position: "absolute", inset: 0, background: gradient }} />;
}

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2400&q=80";
