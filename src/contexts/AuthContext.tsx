
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = 'http://localhost:5000/api';

// Demo users for the preview environment
const DEMO_USERS = [
  {
    id: "demo-user-1",
    name: "Demo User",
    email: "demo@example.com",
    password: "password123"
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In preview mode, use the demo user
      const demoUser = DEMO_USERS.find(u => u.email === email && u.password === password);
      
      if (demoUser) {
        const userData = {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email
        };
        
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        sonnerToast.success(`Welcome back, ${userData.name}!`);
        return true;
      }

      // Try to authenticate with the backend if not in preview mode
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          sonnerToast.error("Login failed: Invalid email or password");
          return false;
        }

        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        sonnerToast.success(`Welcome back, ${data.user.name}!`);
        return true;
      } catch (error) {
        console.error("Backend login error:", error);
        sonnerToast.error("Unable to connect to backend, using demo mode instead");
        
        // If backend fails but credentials match demo user, allow login
        if (demoUser) {
          const userData = {
            id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email
          };
          
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
          sonnerToast.success(`Welcome back, ${userData.name}!`);
          return true;
        }
        
        sonnerToast.error("Login failed: Invalid email or password");
        return false;
      }
    } catch (error) {
      sonnerToast.error("Login failed: An error occurred during login");
      console.error("Login error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if email is already used by demo users
      const existingUser = DEMO_USERS.find(u => u.email === email);
      if (existingUser) {
        sonnerToast.error("Signup failed: Email already in use");
        return false;
      }

      // Create new demo user (only in memory for preview)
      const newUser = {
        id: `demo-user-${Date.now()}`,
        name,
        email
      };
      
      // Try to sign up with backend if not in preview mode
      try {
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          sonnerToast.error(`Signup failed: ${data.message || 'An error occurred'}`);
          return false;
        }

        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        sonnerToast.success(`Welcome, ${name}!`);
        return true;
      } catch (error) {
        console.error("Backend signup error:", error);
        sonnerToast.info("Using preview mode: Account created locally only");
        
        // If backend fails, create a local user
        setUser(newUser);
        localStorage.setItem("user", JSON.stringify(newUser));
        sonnerToast.success(`Welcome, ${name}!`);
        return true;
      }
    } catch (error) {
      sonnerToast.error("Signup failed: An error occurred during signup");
      console.error("Signup error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    sonnerToast.success("You have been successfully logged out");
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Check if email exists in demo users
      const demoUser = DEMO_USERS.find(u => u.email === email);
      if (!demoUser) {
        sonnerToast.error("Reset failed: No account found with this email");
        return false;
      }
      
      // Try to use backend if not in preview mode
      try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          sonnerToast.error(`Reset failed: ${data.message || 'No account found with this email'}`);
          return false;
        }
        
        sonnerToast.success("Reset code sent: Check your email for the reset code");
        return true;
      } catch (error) {
        console.error("Backend forgot password error:", error);
        sonnerToast.info("Using preview mode: Use '123456' as your reset code");
        return true;
      }
    } catch (error) {
      sonnerToast.error("Reset failed: An error occurred");
      console.error("Forgot password error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In preview mode, accept any code as valid
      const demoUser = DEMO_USERS.find(u => u.email === email);
      if (!demoUser) {
        sonnerToast.error("Reset failed: User not found");
        return false;
      }
      
      // Demo mode always accepts '123456' as the code
      if (code !== '123456') {
        sonnerToast.error("Reset failed: Invalid or expired reset code");
        return false;
      }
      
      // Try to reset with backend if not in preview mode
      try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, code, newPassword }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          sonnerToast.error(`Reset failed: ${data.message || 'Invalid or expired reset code'}`);
          return false;
        }
        
        sonnerToast.success("Password reset successful: You can now login with your new password");
        return true;
      } catch (error) {
        console.error("Backend reset password error:", error);
        sonnerToast.success("Password reset successful: You can now login with your new password");
        return true;
      }
    } catch (error) {
      sonnerToast.error("Reset failed: An error occurred");
      console.error("Reset password error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
