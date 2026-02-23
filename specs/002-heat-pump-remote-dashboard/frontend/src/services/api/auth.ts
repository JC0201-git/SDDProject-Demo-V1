// ============================================================================
// API 服務：Auth（認證）
// ============================================================================
// 實作 login()、logout()、getCurrentUser() 函式
// ============================================================================

import { apiClient } from './client';
import { ApiResponse, LoginRequest, LoginResponse } from '../../types/api';

/**
 * 登入
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<ApiResponse<LoginResponse>>(
    '/api/auth/login',
    { username, password } as LoginRequest
  );
  
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error?.message || '登入失敗');
  }
  
  return response.data.data;
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  await apiClient.post<ApiResponse>('/api/auth/logout');
}

/**
 * 取得當前使用者資訊
 */
export async function getCurrentUser(): Promise<LoginResponse | null> {
  try {
    const response = await apiClient.get<ApiResponse<LoginResponse>>('/api/auth/session');
    
    if (!response.data.success || !response.data.data) {
      return null;
    }
    
    return response.data.data;
  } catch (error) {
    return null;
  }
}
