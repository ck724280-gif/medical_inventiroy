import axios from 'axios';

const getBaseApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const trimmed = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return 'https://medical-inventiroy.onrender.com/api';
};

export const apiClient = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('medcare_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const branchId = localStorage.getItem('medcare_branch_id');
      if (branchId && config.headers) {
        config.headers['x-branch-id'] = branchId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-Refresh Token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('medcare_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${getBaseApiUrl()}/auth/refresh`, { refreshToken });

          const { accessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('medcare_access_token', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('medcare_refresh_token', newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          // Token refresh failed - clean storage and redirect to login
          localStorage.removeItem('medcare_access_token');
          localStorage.removeItem('medcare_refresh_token');
          localStorage.removeItem('medcare_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        localStorage.removeItem('medcare_access_token');
        localStorage.removeItem('medcare_refresh_token');
        localStorage.removeItem('medcare_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);
