// src/contexts/AuthContext.js
import React, { createContext, useState, useContext } from 'react';
import AuthService from '../services/Auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // AuthService의 isAuthenticated() 함수가 boolean을 반환한다고 가정
  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token') || '';

  const login = async (username, password) => {
    setLoading(true);
    try {
      // AuthService.login은 토큰 저장 등 내부 처리를 수행한 후 데이터를 반환합니다.
      await AuthService.login(username, password);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
  };

  const contextValue = {
    isAuthenticated,
    loading,
    token,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
