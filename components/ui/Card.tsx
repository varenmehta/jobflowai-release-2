import clsx from "clsx";
import type { HTMLAttributes } from "react";

type CardVariant = "surface" | "elevated" | "glass";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export default function Card({ variant = "surface", className, ...props }: CardProps) {
  return <div className={clsx("ui-card", `ui-card--${variant}`, className)} {...props} />;
}
