import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const login = async (creds) => {
    const u = await api.login(creds)
    setUser(u)
    return u
  }
  const register = async (data) => {
    const u = await api.register(data)
    setUser(u)
    return u
  }
  const logout = async () => {
    await api.logout()
    setUser(null)
  }
  const refreshUser = async () => {
    const u = await api.me()
    setUser(u)
    return u
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
