"use client";

import { useState } from "react";

type Props = {
  value: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
};

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const active = hovered ?? value ?? 0;
  const sizeCls = size === "sm" ? "text-base" : "text-2xl";

  return (
    <div className={`flex gap-0.5 ${sizeCls}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(null)}
          className={`transition-colors leading-none ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${active >= star ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}
          aria-label={`${star}星`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
