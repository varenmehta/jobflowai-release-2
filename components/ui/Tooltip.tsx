"use client";

import { useState } from "react";
import clsx from "clsx";
import type { ReactNode } from "react";

type TooltipProps = {
  content: string;
  className?: string;
  children: ReactNode;
};

export default function Tooltip({ content, className, children }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={clsx("ui-tooltip-wrap", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open ? <span className="ui-tooltip">{content}</span> : null}
    </span>
  );
}
