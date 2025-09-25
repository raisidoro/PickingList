import { z } from 'zod';

const envSchema = z.object({
    VITE_API_URL: z.string().url(),
    VITE_API_OPERADORES_URL: z.string().url(),
    VITE_API_CARGA_URL: z.string().url(),
    VITE_API_PALLETS_URL: z.string().url(),
    VITE_API_ITENS_URL: z.string().url(),
    VITE_APP_NAME: z.string().url(),
});

export const env = envSchema.parse(import.meta.env);