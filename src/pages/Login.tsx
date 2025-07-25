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

type InputProps = {
    label: string;
    type?: string;
    className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

function Input({ label, type = "text", className = "", ...props }: InputProps) {
    return (
        <label className="flex flex-col gap-1">
            <Text variant="muted" className="text-base">
                {label}
            </Text>
            <input
                type={type}
                className={`
                    bg-transparent border border-gray-500
                    rounded-xl px-2 py-2 text-gray-800
                    focus:outline-none focus:border-gray-700
                    ${className}
                `}
                {...props}
            />
        </label>
    );
}


function LoginForm() {
      return (
      <Card className={`
        flex flex-col gap-8 w-[22.25rem]
        pt-14 px-8 pb-8
      `}>
        <img
          src="/GDBR_logo.png"
          alt="GDBR"
          className="mx-auto"
        />
        <Text as="p" variant="blast" className="text-center mt-0">
            LOGIN
        </Text>
        <form className="flex flex-col gap-6">
        <Input label="Matrícula" type="text" className="default"/>
        <Input label="Senha" type="password" className="default"/>
        <Button variant="primary" className="py-3">Entrar</Button>
        </form>
      </Card>
      )
}

export default function Login() {
    return (
        <main
            className={`
                min-h-screen flex items-center justify-center
                py-28 px-4 bg-gradient-to-b from-gray-200 to-gray-200
            `}
        >
            <LoginForm />
        </main>
    );
}
