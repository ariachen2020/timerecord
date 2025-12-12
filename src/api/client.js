import axios from 'axios';

// 生產環境使用相對路徑（同域名），開發環境使用完整 URL
const baseURL = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

const client = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
client.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// 響應攔截器
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// API 函數
export const api = {
  // 認證
  login: (credentials) => client.post('/api/auth/login', credentials),
  logout: () => client.post('/api/auth/logout'),
  getMe: () => client.get('/api/auth/me'),

  // 記錄
  addRecord: (data) => client.post('/api/records', data),
  getEmployee: (employeeId) => client.get(`/api/records/employee/${employeeId}`),
  getOverview: () => client.get('/api/records/overview'),

  // 員工管理
  getAllEmployees: () => client.get('/api/employees'),
  deleteEmployee: (employeeId) => client.delete(`/api/employees/${employeeId}`),
};

export default client;
