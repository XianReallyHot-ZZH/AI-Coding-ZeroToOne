import axios, { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.data) {
      const apiError: ApiError = {
        code: error.response.data.code || 'UNKNOWN_ERROR',
        message: error.response.data.message || 'An error occurred',
        details: error.response.data.details,
      };
      return Promise.reject(apiError);
    }
    
    if (error.request) {
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your connection.',
      } as ApiError);
    }
    
    return Promise.reject({
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
    } as ApiError);
  }
);

export default api;
