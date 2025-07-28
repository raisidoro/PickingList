import { api } from '../lib/axios';

export interface SignInBody {
  cNfc: string;
  cMat: string;
  cPass: string;
}

export async function signIn(params: SignInBody) {
  return api.get('/rest/PICK_OPERAD', { params });
}


