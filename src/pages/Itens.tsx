import React, { useEffect, useState } from 'react';
import { type JSX } from "react";
import { api } from '../lib/axios'; 

const textVariants = {
  default: "text-xl",
  muted: "text-xl text-gray-500",
  heading: "text-xl",
  blast: "text-2xl",
  title: "text-3xl",
};

type TextProps = {
  as?: keyof JSX.IntrinsicElements;
  variant?: keyof typeof textVariants;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

function Text({ as = "span", variant = "default", className = "", children, ...props }: TextProps) {
  const Component = as;
  return React.createElement(Component, { className: `${textVariants[variant]} ${className}`, ...props }, children);
}

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
};

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div 
      className={`bg-gray-100 shadow-md rounded-2xl ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}


