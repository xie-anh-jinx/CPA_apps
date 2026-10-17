"use client";
/**
 * AIOrb — orb animasi AI (gradient blob + rings 3D + glass) dari desain referensi.
 * `size` = diameter orb yang terlihat (px). Seluruh dimensi internal diskalakan
 * otomatis lewat CSS variable `--s`, sehingga orb bisa dipakai di launcher kecil
 * maupun di panel voice yang besar.
 */
import React from "react";

export default function AIOrb({ size = 150, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`aic-orb ${className}`}
      style={{ "--s": `${size * 2}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="aic-orb-core">
        <div className="aic-c aic-c4" />
        <div className="aic-c aic-c1" />
        <div className="aic-c aic-c2" />
        <div className="aic-c aic-c3" />
        <div className="aic-rings" />
      </div>
      <div className="aic-glass" />
    </div>
  );
}
