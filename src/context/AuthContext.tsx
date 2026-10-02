import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from "../lib/api";

export type User = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

type AuthContextType = {
  user: User | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{
    verificationEmailSent?: boolean;
  }>;

  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuthentication() {
      try {
        const data = await getCurrentUser();

        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuthentication();
  }, []);

  async function login(
    email: string,
    password: string
  ) {
    const data = await loginUser(
      email,
      password
    );

    if (data?.user) {
      setUser(data.user);
    }
  }

  async function register(
    name: string,
    email: string,
    password: string
  ) {
    const data = await registerUser(
      name,
      email,
      password
    );

    if (data?.user) {
      setUser(data.user);
    }

    return {
      verificationEmailSent:
        data?.verificationEmailSent,
    };
  }

  async function logout() {
    await logoutUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}