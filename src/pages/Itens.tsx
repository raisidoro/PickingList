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

export interface Item {
  kanban: string;
  sequen: string;
  qtd_caixa: string;
  qtd_peca: string;
  embalagem: string;
  multiplo: string;
  status: string;
}

export interface ItensResponse {
  itens: Item[];
}

export interface ItensProps {
  itens: Item[];
}

export function Itens({ itens }: ItensProps) {
  const [selectedCod, setSelectedCod] = useState<string | null>(null);

  const handleSelect = (item: Item) => {
    setSelectedCod(item.kanban);
  };

  return (
    <div className="p-4">
      <Text variant="title" className="mb-4">Itens</Text>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {itens.map((item) => (
          <Card
            key={item.kanban}
            className={`p-6 cursor-pointer border rounded-2xl transition-shadow duration-300 ${
              selectedCod === item.kanban
                ? 'border-black-600 shadow-black-300 shadow-lg'
                : 'border-transparent hover:shadow-md hover:border-black'
            }`}
            onClick={() => handleSelect(item)}
            tabIndex={0}
          >
            <Text variant="heading">{item.kanban}</Text>
            <Text variant="default" className="mt-2">Sequência: {item.sequen}</Text>
            <Text variant="default" className="mt-2">Quantidade por Caixa: {item.qtd_caixa}</Text>
            <Text variant="default" className="mt-2">Quantidade por Peça: {item.qtd_peca}</Text>
            <Text variant="default" className="mt-2">Embalagem: {item.embalagem}</Text>
            <Text variant="default" className="mt-2">Múltiplo: {item.multiplo}</Text>
            <Text variant="default" className="mt-2">Status: {item.status}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
