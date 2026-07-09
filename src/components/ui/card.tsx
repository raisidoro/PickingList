import React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`bg-gray-100 shadow-md rounded-2xl ${className}`} {...props}>
      {children}
    </div>
  );
}