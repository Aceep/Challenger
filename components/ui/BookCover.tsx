import Image from "next/image";

/** A cover is taller than it is wide: 3 × 4, like the points plate of the readings list. */
const RATIO = 4 / 3;

type Props = {
  /** `Book.coverUrl` — always a covers.openlibrary.org URL, null when nobody picked one. */
  src?: string | null;
  title: string;
  /** Width in pixels; the height follows the ratio. */
  width?: number;
  className?: string;
};

/**
 * The cover of a reading, with the degraded rendering — a paper tile bearing the
 * initial — when there is none. Same footprint either way, so a list never jumps
 * depending on which readings happen to have a cover.
 */
export function BookCover({ src, title, width = 40, className = "" }: Props) {
  const height = Math.round(width * RATIO);
  if (!src) {
    return (
      <span className={`cover-tile ${className}`} style={{ width, height, fontSize: Math.round(width * 0.45) }} aria-hidden>
        {title.trim().slice(0, 1).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <Image
      className={`cover-art ${className}`}
      src={src}
      alt={`Couverture de « ${title} »`}
      width={width}
      height={height}
      sizes={`${width}px`}
      style={{ width, height }}
    />
  );
}
