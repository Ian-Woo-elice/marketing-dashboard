import api from './API';

const DashboardService = {
  // 최상위 대시보드 데이터 가져오기
  getTopDashboardData: async () => {
    try {
      const response = await api.get('/dashboard');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // 트랙 대시보드 데이터 가져오기
  getTrackDashboardData: async (trackName) => {
    try {
      const response = await api.get(`/track/${trackName}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // 배치 대시보드 데이터 가져오기
  getBatchDashboardData: async (trackName, batch) => {
    try {
      const response = await api.get(`/track/${trackName}/batch/${batch}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // 트랙 목록 가져오기
  getTracks: async () => {
    try {
      const response = await api.get('/tracks');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // 특정 트랙의 배치 목록 가져오기
  getTrackBatches: async (trackName) => {
    try {
      const response = await api.get(`/track/${trackName}/batches`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default DashboardService;