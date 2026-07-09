import React, { type JSX } from "react";

export const textVariants = {
  default: "text-xl sm:text-2xl",
  muted: "text-xl sm:text-2xl text-gray-500",
  heading: "text-xl sm:text-2xl",
  blast: "text-2xl sm:text-3xl",
  title: "text-3xl sm:text-4xl",
} as const;

type Variant = keyof typeof textVariants;

export type TextProps = {
  as?: keyof JSX.IntrinsicElements;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Text({ as = "span", variant = "default", className = "", children, ...props }: TextProps) {
  const Component = as;
  return React.createElement(Component, { className: `${textVariants[variant]} ${className}`, ...props }, children);
}