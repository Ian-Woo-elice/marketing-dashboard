// src/Auth.js
import api from './API';

const AuthService = {
  // 로그인 함수: 하드코딩된 ID와 패스워드 검증
  login: async (username, password) => {
    // 설정된 ID와 패스워드
    const validUsername = 'elice-kdt';  // 여기서 ID를 설정합니다.
    const validPassword = 'elicetrack2025!!';   // 여기서 패스워드를 설정합니다.

    // 하드코딩된 값과 비교하여 인증 처리
    if (username === validUsername && password === validPassword) {
      // 로그인 성공: dummy token 생성 및 저장
      const token = 'dummy-token';
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify({ username: validUsername }));
      return { token, user: { username: validUsername } };
    } else {
      // 인증 실패: 텍스트 오류 메시지를 throw합니다.
      throw new Error("로그인 정보를 확인해 주세요.");
    }
  },
  
  // 로그아웃 함수
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  },
  
  // 현재 인증 상태 확인
  isAuthenticated: () => {
    return localStorage.getItem('isAuthenticated') === 'true';
  },
  
  // 현재 사용자 정보 가져오기
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },
  
  // 토큰 유효성 검증
  validateToken: async () => {
    try {
      const response = await api.get('/auth/validate');
      return response.data;
    } catch (error) {
      // 토큰이 유효하지 않으면 로그아웃 처리
      AuthService.logout();
      throw error;
    }
  }
};

export default AuthService;
