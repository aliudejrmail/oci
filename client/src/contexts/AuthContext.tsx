import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../services/api'

interface Usuario {
  id: string
  nome: string
  email: string
  tipo: string
  unidadeId?: string | null
  unidade?: { id: string; cnes: string; nome: string } | null
  unidadeExecutanteId?: string | null
  unidadeExecutante?: { id: string; cnes: string; nome: string } | null
}

interface AuthContextType {
  usuario: Usuario | null
  token: string | null
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tokenStorage = localStorage.getItem('token')
    const usuarioStorage = localStorage.getItem('usuario')

    if (tokenStorage && usuarioStorage) {
      setToken(tokenStorage)
      setUsuario(JSON.parse(usuarioStorage))
      api.defaults.headers.common['Authorization'] = `Bearer ${tokenStorage}`
    }

    setLoading(false)
  }, [])

  const login = async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha })
    const { token: newToken, usuario: newUsuario } = response.data

    setToken(newToken)
    setUsuario(newUsuario)
    localStorage.setItem('token', newToken)
    localStorage.setItem('usuario', JSON.stringify(newUsuario))
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const logout = () => {
    setToken(null)
    setUsuario(null)
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
