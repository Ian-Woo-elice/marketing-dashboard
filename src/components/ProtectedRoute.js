import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="로딩 중..." />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // 인증되지 않은 경우 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;