import axios from 'axios';
import { env } from '../env'; 

export const api = axios.create({
  baseURL: env.VITE_API_OPERADORES_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr036841',   
  },
});

export const apiCarga = axios.create({
  baseURL: env.VITE_API_CARGA_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr036841',   
  },
});

export const apiPallets = axios.create({
  baseURL: env.VITE_API_PALLETS_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr036841',   
  },
});

export const apiItens = axios.create({
  baseURL: env.VITE_API_ITENS_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr036841',   
  },
});