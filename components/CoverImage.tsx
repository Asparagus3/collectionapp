"use client";

import { useState } from "react";
import Image from "next/image";
import Placeholder from "@/components/Placeholder";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export default function CoverImage({ src, alt, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <Placeholder title={alt} className={`h-full w-full text-xl ${className}`} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      sizes="48px"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
