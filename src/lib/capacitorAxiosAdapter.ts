import { CapacitorHttp } from '@capacitor/core';
import type { AxiosResponse } from 'axios';

export const capacitorHttpAdapter = async (config: any): Promise<AxiosResponse> => {
  const method = config.method?.toUpperCase() || 'GET';

  const headers: Record<string, string> = { ...config.headers };
  if (config.auth) {
    const token = btoa(`${config.auth.username}:${config.auth.password}`);
    headers['Authorization'] = `Basic ${token}`;
  }

  const url = config.baseURL
    ? `${config.baseURL}${config.url || ''}`
    : config.url;

  const response = await CapacitorHttp.request({  
    method,
    url,
    headers,
    data: config.data,
    params: config.params,
  });

  return {
    data: response.data,
    status: response.status,
    statusText: String(response.status),
    headers: response.headers,
    config,
  };
};