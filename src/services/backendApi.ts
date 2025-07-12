// src/services/backendApi.ts
const API_BASE_URL = 'http://localhost:5000/api'; // Ensure this matches your Flask/FastAPI base route

export interface User {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  role: 'main_admin' | 'dept_admin' | 'staff';
  department_id?: string;
  department_name?: string;
  programme?: string;
  type?: string;
  contact_number?: string;
  username?: string;
  staff_role?: 'assistant_professor' | 'professor' | 'hod';
  subjects_selected?: string[];
  subjects_locked?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class BackendApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse response',
      };
    }
  }

  /** ======================= System ======================= **/

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch (err) {
      console.error('Backend connection failed:', err);
      return false;
    }
  }

  /** ======================= Authentication ======================= **/

  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const result = await this.handleResponse<{ user: User; token: string }>(response);

      if (result.success && result.data?.token) {
        localStorage.setItem('auth_token', result.data.token);
      }

      return result;
    } catch (err) {
      return {
        success: false,
        error: 'Network error: Unable to reach backend',
      };
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const result = await this.handleResponse<void>(response);
      localStorage.removeItem('auth_token');
      return result;
    } catch (err) {
      localStorage.removeItem('auth_token');
      return { success: false, error: 'Logout failed' };
    }
  }

  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse<{ user: User }>(response);
    } catch (err) {
      return { success: false, error: 'Token verification failed' };
    }
  }

  /** ======================= User Management ======================= **/

  async createUser(userData: {
    name: string;
    employee_id: string;
    department: string;
    programme: string;
    type: string;
    role: string;
    contact_number: string;
    email: string;
    staff_role?: string;
  }): Promise<ApiResponse<{ user: User; credentials: { username: string; password: string } }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/register-user`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });
      return this.handleResponse(response);
    } catch (err) {
      return { success: false, error: 'Failed to register user' };
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      return this.handleResponse<User>(response);
    } catch (err) {
      return { success: false, error: 'Failed to update user' };
    }
  }

  /** ======================= Department ======================= **/

  async getDepartments(): Promise<ApiResponse<{ id: string; name: string; code: string }[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (err) {
      return { success: false, error: 'Failed to fetch departments' };
    }
  }

  async createDepartment(deptData: { name: string; code: string }): Promise<ApiResponse<{ id: string; name: string; code: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(deptData),
      });
      return this.handleResponse(response);
    } catch (err) {
      return { success: false, error: 'Failed to create department' };
    }
  }
}

export const backendApi = new BackendApiService();
