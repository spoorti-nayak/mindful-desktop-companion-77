
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
      // In a real app, this would call an API
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const foundUser = users.find(
        (u: any) => u.email === email && u.password === password
      );

      if (!foundUser) {
        sonnerToast.error("Login failed", "Invalid email or password");
        return false;
      }

      // Remove password before storing in state
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("user", JSON.stringify(userWithoutPassword));
      
      sonnerToast.success("Login successful", `Welcome back, ${foundUser.name}!`);
      return true;
    } catch (error) {
      sonnerToast.error("Login failed", "An error occurred during login");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In a real app, this would call an API
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      
      // Check if user already exists
      if (users.some((u: any) => u.email === email)) {
        sonnerToast.error("Signup failed", "Email already in use");
        return false;
      }

      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password,
      };
      
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      
      // Remove password before storing in state
      const { password: _, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword);
      localStorage.setItem("user", JSON.stringify(userWithoutPassword));
      
      sonnerToast.success("Signup successful", `Welcome, ${name}!`);
      return true;
    } catch (error) {
      sonnerToast.error("Signup failed", "An error occurred during signup");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    sonnerToast.success("Logged out", "You have been successfully logged out");
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In a real app, this would call an API to send an email
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const foundUser = users.find((u: any) => u.email === email);
      
      if (!foundUser) {
        sonnerToast.error("Reset failed", "No account found with this email");
        return false;
      }
      
      // Generate a reset code (in real app, this would be sent via email)
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the reset code
      const resetRequests = JSON.parse(localStorage.getItem("resetRequests") || "[]");
      resetRequests.push({
        email,
        code: resetCode,
        timestamp: Date.now(),
      });
      localStorage.setItem("resetRequests", JSON.stringify(resetRequests));
      
      // Simulate email sending
      console.log(`Reset code for ${email}: ${resetCode}`);
      sonnerToast.success("Reset code sent", "Check your email (or console) for the reset code");
      return true;
    } catch (error) {
      sonnerToast.error("Reset failed", "An error occurred");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // In a real app, this would verify the code with an API
      const resetRequests = JSON.parse(localStorage.getItem("resetRequests") || "[]");
      const validRequest = resetRequests.find(
        (r: any) => r.email === email && r.code === code && (Date.now() - r.timestamp < 3600000)
      );
      
      if (!validRequest) {
        sonnerToast.error("Reset failed", "Invalid or expired reset code");
        return false;
      }
      
      // Update the user's password
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const userIndex = users.findIndex((u: any) => u.email === email);
      
      if (userIndex === -1) {
        sonnerToast.error("Reset failed", "User not found");
        return false;
      }
      
      users[userIndex].password = newPassword;
      localStorage.setItem("users", JSON.stringify(users));
      
      // Remove the reset request
      const newResetRequests = resetRequests.filter(
        (r: any) => !(r.email === email && r.code === code)
      );
      localStorage.setItem("resetRequests", JSON.stringify(newResetRequests));
      
      sonnerToast.success("Password reset successful", "You can now login with your new password");
      return true;
    } catch (error) {
      sonnerToast.error("Reset failed", "An error occurred");
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
