import React from "react";

export const buttonVariants = {
  default: "text-blue-600 hover:text-blue-800",
  primary: "bg-blue-300 hover:bg-gray-400 text-gray-900",
} as const;

type Variant = keyof typeof buttonVariants;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

export function Button({ variant = "default", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-xl transition disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}