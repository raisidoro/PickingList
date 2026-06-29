import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { env } from '../env';
import { capacitorHttpAdapter } from './capacitorAxiosAdapter'; 

const adapter = Capacitor.isNativePlatform() ? capacitorHttpAdapter : undefined;

const defaultAuth = {
  username: 'depto.ti',  
  password: 'TOthEu$@2k26',    
};

const makeApi = (baseURL: string) =>
  axios.create({ baseURL, auth: defaultAuth, adapter });

export const apiOperadores = makeApi(env.VITE_API_OPERADORES_URL);
export const apiCarga      = makeApi(env.VITE_API_CARGA_URL);
export const apiPallets    = makeApi(env.VITE_API_PALLETS_URL);
export const apiLog        = makeApi(env.VITE_API_LOG_URL);
export const apiItens      = makeApi(env.VITE_API_ITENS_URL);
export const apiVzias      = makeApi(env.VITE_API_VZIA_URL);