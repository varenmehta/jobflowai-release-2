import clsx from "clsx";
import type { HTMLAttributes } from "react";

type BadgeIntent = "default" | "intent" | "risk" | "stage";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  intent?: BadgeIntent;
};

export default function Badge({ intent = "default", className, ...props }: BadgeProps) {
  return <span className={clsx("ui-badge", `ui-badge--${intent}`, className)} {...props} />;
}
