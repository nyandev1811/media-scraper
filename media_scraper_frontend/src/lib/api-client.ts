import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

import { getSessionId } from './session';

apiClient.interceptors.request.use((config) => {
  const sessionId = getSessionId();
  if (sessionId) {
    config.headers['x-session-id'] = sessionId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);
