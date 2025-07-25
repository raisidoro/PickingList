import { api } from '@/lib/axios';

export interface SignInBody {
    cNfc: string;
    cMatricula: string;
    cPassword: string;
}

export async function signIn(data: SignInBody){
    await api.post('/PICK_OPERAD', data);
}
