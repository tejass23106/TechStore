import { createContext } from "react";

export type User = {
  id: number;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
};

export type AuthContextType = {
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

export const AuthContext =
  createContext<AuthContextType | null>(null);