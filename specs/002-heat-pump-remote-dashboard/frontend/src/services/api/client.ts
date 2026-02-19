import axios, { AxiosError } from 'axios';
import { message } from 'antd';
import { ApiResponse } from '../../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000';
const REQUEST_TIMEOUT = 30000;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.error?.message || '請求失敗，請稍後再試';

      switch (status) {
        case 401:
          message.error('登入已過期，請重新登入');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          break;

        case 403:
          message.error('您沒有權限執行此操作');
          break;

        case 404:
          message.error('請求的資源不存在');
          break;

        case 429:
          message.warning(errorMessage || '操作過於頻繁，請稍後再試');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          message.error('伺服器錯誤，請稍後再試');
          break;

        default:
          message.error(errorMessage);
          break;
      }
    } else if (error.request) {
      message.error('網路連線失敗，請檢查網路設定');
    } else {
      message.error('請求設定錯誤');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
