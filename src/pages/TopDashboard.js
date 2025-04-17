// src/pages/TopDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout, Card, Row, Col, Typography, Button, Spin, message } from "antd";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";

const { Title } = Typography;
const { Header, Content } = Layout;

function TopDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, token, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 전체 집계 계산 함수
  const calculateOverallStats = (data) => {
    const overallTotal = Object.values(data).reduce((sum, track) => sum + track.total, 0);
    const overallCompleted = Object.values(data).reduce((sum, track) => sum + track.completed, 0);
    const overallRate = overallTotal > 0 ? ((overallCompleted / overallTotal) * 100).toFixed(1) : 0;
    return { overallTotal, overallCompleted, overallRate };
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 테스트용 dummy-token이면 dummy 데이터를 사용합니다.
        if (token === "dummy-token") {
          const dummyData = {
            "Track1": { total: 10, completed: 7 },
            "Track2": { total: 20, completed: 15 },
            "Track3": { total: 30, completed: 25 },
          };
          setTimeout(() => {
            setDashboardData(dummyData);
            setLoading(false);
          }, 500);
          return;
        }
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
        if (err.response && err.response.status === 401) {
          message.error("인증이 만료되었습니다. 다시 로그인해주세요.");
          logout();
          navigate("/login");
        }
      }
    };
    fetchDashboardData();
  }, [isAuthenticated, token, navigate, logout]);

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Spin size="large" tip="데이터를 불러오는 중..." style={{ margin: "auto" }} />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: "100vh", padding: "20px" }}>
        <Content>
          <Card>
            <Title level={4} style={{ color: "red" }}>{error}</Title>
            <Button type="primary" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  const { overallTotal, overallCompleted, overallRate } = calculateOverallStats(dashboardData);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ background: "#fff", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px #f0f1f2" }}>
        <Title level={3} style={{ margin: 0 }}>KDT 마케팅 대시보드</Title>
        <Button type="primary" onClick={() => { logout(); navigate('/login'); }}>로그아웃</Button>
      </Header>
      <Content style={{ padding: "20px" }}>
        <Card style={{ marginBottom: "20px" }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card>
                <Title level={4}>전체 지원자 수</Title>
                <Title level={3}>{overallTotal}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Title level={4}>작성완료 수</Title>
                <Title level={3}>{overallCompleted}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Title level={4}>작성완료율</Title>
                <Title level={3}>{overallRate}%</Title>
              </Card>
            </Col>
          </Row>
        </Card>
        <Row gutter={[16, 16]}>
          {Object.keys(dashboardData).map((trackName) => (
            <Col key={trackName} xs={24} sm={12} md={8}>
              <Card hoverable title={`KDT ${trackName} 대시보드`}>
                <p>
                  총 지원자: {dashboardData[trackName].total}명<br />
                  작성완료: {dashboardData[trackName].completed}명<br />
                  완료율: {((dashboardData[trackName].completed / dashboardData[trackName].total) * 100).toFixed(1)}%
                </p>
                <Button type="primary" onClick={() => navigate(`/track/${trackName}`)}>자세히 보기</Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Content>
    </Layout>
  );
}

export default TopDashboard;
