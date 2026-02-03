import axios from 'axios'

// Em desenvolvimento: use VITE_API_URL para apontar direto ao backend (ex.: http://localhost:3001/api)
// quando o proxy do Vite falhar. Na raiz do projeto rode: npm run dev (backend + frontend).
const baseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para adicionar token e tratar FormData
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Se for FormData, remove Content-Type para o axios definir multipart/form-data com boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
