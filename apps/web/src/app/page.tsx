"use client";

import Image from "next/image";
import Link from "next/link";
import { HERO_IMAGE } from "@/components/ProductPhoto";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { tx } = useStore();

  return (
    <section className="hero">
      <div className="hero-photo">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          quality={80}
          sizes="(max-width: 860px) 100vw, 58vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="hero-copy">
        <p className="eyebrow rise">{tx("heroEyebrow")}</p>
        <h1 className="display rise rise-delay-1">{tx("brand")}</h1>
        <p className="lead rise rise-delay-2">{tx("tagline")}</p>
        <div className="hero-actions rise rise-delay-3">
          <Link href="/catalog" className="btn">
            {tx("heroCta")}
          </Link>
          <Link href="/architecture" className="btn-ghost">
            {tx("heroSecondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
