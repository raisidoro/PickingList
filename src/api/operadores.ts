import { apiOperadores } from '../lib/axios';

export interface SignInBody {
  cNfc: string;
  cMat: string;
  cPass: string;
}

export async function signIn(params: SignInBody) {
  return apiOperadores.get('/rest/PICK_OPERAD', { params });
}


