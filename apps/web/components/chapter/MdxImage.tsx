import type { ComponentProps } from "react";
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
  const numericWidth =
    typeof width === "number" ? width : typeof width === "string" ? Number(width) : NaN;
  const numericHeight =
    typeof height === "number" ? height : typeof height === "string" ? Number(height) : NaN;

  const aspectRatio =
    Number.isFinite(numericWidth) &&
    Number.isFinite(numericHeight) &&
    numericWidth > 0 &&
    numericHeight > 0
      ? { width: numericWidth, height: numericHeight }
      : null;

  return (
    <span className="my-8 block overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-3 shadow-2xl shadow-slate-950/30">
      <span className="block overflow-hidden rounded-2xl">
        <NextImage
          alt={alt}
          width={aspectRatio?.width ?? 1200}
          height={aspectRatio?.height ?? 630}
          sizes={sizes ?? "(min-width: 1280px) 960px, (min-width: 768px) 80vw, 100vw"}
          style={{ width: "100%", height: "auto", ...style }}
          {...props}
        />
      </span>
    </span>
  );
}

export default Image;
