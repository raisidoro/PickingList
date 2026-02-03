import axios from 'axios';
import { env } from '../env'; 

export const apiOperadores = axios.create({
  baseURL: env.VITE_API_OPERADORES_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr025986',   
  },
});

export const apiCarga = axios.create({
  baseURL: env.VITE_API_CARGA_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr025986',   
  },
});

export const apiPallets = axios.create({
  baseURL: env.VITE_API_PALLETS_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr025986',   
  },
});

export const apiLog = axios.create({
  baseURL: env.VITE_API_LOG_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr025986',   
  },
});

export const apiItens = axios.create({
  baseURL: env.VITE_API_ITENS_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr025986',   
  },
});

export const apiVzias = axios.create({
  baseURL: env.VITE_API_VZIA_URL, 
  auth: {
    username: 'webservice', 
    password: '@Gdbr025986',   
  },
});