// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 이미 인증된 사용자는 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage(''); // 이전 오류 메시지 초기화
    try {
      const success = await login(values.username, values.password);
      if (success) {
        navigate('/');
      }
    } catch (error) {
      // 에러 메시지를 state에 저장하여 화면에 표시합니다.
      setErrorMessage("아이디와 비밀번호를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: '#f0f2f5' 
    }}>
      <Card 
        title="시스템 로그인" 
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        headStyle={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
      >
        <Spin spinning={loading || authLoading}>
          <Form
            form={form}
            name="login_form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '아이디를 입력해주세요!' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="아이디" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '비밀번호를 입력해주세요!' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" />
            </Form.Item>

            {/* 오류 메시지 영역 */}
            {errorMessage && (
              <p style={{ color: 'red', textAlign: 'center', marginBottom: 16 }}>
                {errorMessage}
              </p>
            )}

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                style={{ width: '100%' }} 
                loading={loading}
              >
                로그인
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default LoginPage;
