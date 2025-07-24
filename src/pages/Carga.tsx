import React, { type JSX } from "react"; 

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

function Text({
    as = "span",
    variant = "default",
    className = "",
    children,
    ...props
}: TextProps) {
    const Component = as;
    return React.createElement(
        Component,
        {
            className: `${textVariants[variant]} ${className}`,
            ...props,
        },
        children
    );
}

const buttonVariants = {
    default: "bg-gray-100",
    primary: "bg-gray-700",
};

type ButtonProps = {
    variant?: keyof typeof buttonVariants;
    className?: string;
    children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
    variant = "default",
    className = "",
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
                flex items-center justify-center rounded-xl
                p-3 cursor-pointer text-gray-100
                bg-gray-800
                ${buttonVariants[variant]}
                ${className}
            `}
            {...props}
        >
            <Text as="span" variant="heading">
                {children}
            </Text>
        </button>
    );
}

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

function Card({ children, className = "" }: CardProps) {
    return (
        <div
            className={`
                bg-gray-100 shadow-md
                rounded-2xl
                ${className}
            `}
        >
            {children}
        </div>
    );
}

type Carga = {
    codCarga: string;
    rota: string;
    dataColeta: string;
    horaColeta: string;
    dataChegada: string;
    horaChegada: string;
    cliente: string;
    qtdPallets: number;
    status: string;
};

function ExibeCargas() {
    const [cargas, setCargas] = React.useState<Carga[]>([]);

    React.useEffect(() => {
        fetch("api/cargas")
            .then((response) => response.json())
            .then((data) => setCargas(data));
    }, []);

    return (
        <Card className="p-4">
            <Text variant="title">Cargas</Text>
            <ul>
                {cargas.map((carga) => (
                    <li key={carga.codCarga}>
                        <Text>{carga.rota}</Text>
                        <Text>{carga.dataColeta}</Text>
                        <Text>{carga.horaColeta}</Text>
                        <Text>{carga.dataChegada}</Text>
                        <Text>{carga.horaChegada}</Text>
                        <Text>{carga.cliente}</Text>
                        <Text>{carga.qtdPallets}</Text>
                        <Text>{carga.status}</Text>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
