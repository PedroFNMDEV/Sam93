import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';

const userSchema = z.object({
  id: z.number(),
  usuario: z.string(),
  nome: z.string(),
  tipo: z.enum(['revenda', 'streaming']).optional(),
  streamings: z.number(),
  espectadores: z.number(),
  bitrate: z.number(),
  espaco: z.number(),
  email: z.string().min(1, 'Email ou usuário é obrigatório'),
  codigo_servidor: z.number().nullable().optional(),
  codigo_cliente: z.number().nullable().optional(),
});

type User = z.infer<typeof userSchema>;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há token salvo
    const token = localStorage.getItem('auth_token');
    if (token) {
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        // Garantir que o tipo seja definido se não estiver presente
        const userDataWithType = {
          ...userData,
          tipo: userData.tipo || 'streaming', // Valor padrão se não estiver presente
          codigo_cliente: userData.codigo_cliente || null
        };
        const validatedUser = userSchema.parse(userDataWithType);
        setUser(validatedUser);
        setIsAuthenticated(true);
      } else {
        const errorData = await response.json();
        if (errorData.expired) {
          // Token expirado, fazer logout automático
          console.log('Token expirado, fazendo logout...');
          localStorage.removeItem('auth_token');
          setUser(null);
          setIsAuthenticated(false);
          navigate('/login');
          return;
        }
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Erro ao validar token:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const getToken = () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.warn('Token de autenticação não encontrado');
    }
    return token;
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      if (data.success && data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        // Garantir que o tipo seja definido
        const userDataWithType = {
          ...data.user,
          tipo: data.user.tipo || 'streaming',
          codigo_cliente: data.user.codigo_cliente || null
        };
        const validatedUser = userSchema.parse(userDataWithType);
        setUser(validatedUser);
        setIsAuthenticated(true);
        navigate('/dashboard');
        toast.success('Login realizado com sucesso!');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
      toast.info('Logout realizado com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer logout');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    // Função removida - registro não é mais permitido
    throw new Error('Registro de novos usuários não é permitido');
  };

  const forgotPassword = async (email: string) => {
    // Função removida - recuperação de senha não é mais permitida
    throw new Error('Recuperação de senha não é permitida');
  };

  // Renderiza um fallback enquanto carrega a sessão
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, forgotPassword, register, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};