import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({ variant = "secondary", className, ...props }: ButtonProps) {
  return <button className={clsx("ui-button", `ui-button--${variant}`, className)} {...props} />;
}
