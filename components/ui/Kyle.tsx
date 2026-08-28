import Image from "next/image";

const RATIO = 455 / 548;

/** The mascot. `width` in pixels; the height follows the source ratio. */
export function Kyle({ width = 48, className = "", alt = "" }: { width?: number; className?: string; alt?: string }) {
  return (
    <Image
      src="/Kyle.png"
      alt={alt}
      width={Math.round(width)}
      height={Math.round(width / RATIO)}
      className={`shrink-0 ${className}`}
      sizes={`${Math.round(width)}px`}
      priority={width >= 200}
      role={alt ? undefined : "presentation"}
    />
  );
}
