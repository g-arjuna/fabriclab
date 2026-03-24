import type { CSSProperties, ComponentProps } from "react";
import NextImage from "next/image";

type Props = ComponentProps<typeof NextImage>;

export function Image({
  alt,
  sizes,
  style,
  width,
  height,
  ...props
}: Props) {
  const aspectRatio =
    typeof width === "number" && typeof height === "number" && width > 0 && height > 0
      ? `${width} / ${height}`
      : "1200 / 630";

  return (
    <span className="my-8 block overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-3 shadow-2xl shadow-slate-950/30">
      <span
        className="relative block overflow-hidden rounded-2xl"
        style={{ aspectRatio } as CSSProperties}
      >
      <NextImage
        alt={alt}
        fill
        sizes={sizes ?? "(min-width: 1280px) 960px, (min-width: 768px) 80vw, 100vw"}
        style={{ objectFit: "cover", ...style }}
        {...props}
      />
      </span>
    </span>
  );
}

export default Image;
