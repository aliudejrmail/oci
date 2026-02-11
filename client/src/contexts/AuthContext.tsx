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
  login: (email: string, senha: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await api.get('/auth/me')
        setUsuario(response.data)
      } catch (error) {
        setUsuario(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, senha: string) => {
    const response = await api.post('/auth/login', { email, senha })
    // O cookie é setado automaticamente pelo backend
    setUsuario(response.data.usuario) // Ajuste conforme resposta do login
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Erro ao fazer logout', error)
    } finally {
      setUsuario(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, loading }}>
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
