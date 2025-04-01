import React from "react";
import { useNavigate } from "react-router-dom";
import { Layout, Card, Row, Col, Typography, Button } from "antd";

const { Title } = Typography;
const { Content } = Layout;

// 더미 데이터 (각 트랙별 집계 데이터)
// 실제 서비스에서는 API 호출이나 전역 상태(예: Redux)를 통해 집계 데이터를 받아올 수 있습니다.
const aggregatedData = {
  자율주행: { total: 310, completed: 190 },
  인공지능: { total: 285, completed: 175 },
  모바일: { total: 390, completed: 270 },
};

function TopDashboard() {
  const navigate = useNavigate();

  // 전체 집계: 각 트랙의 합계 계산
  const overallTotal = Object.values(aggregatedData).reduce(
    (sum, data) => sum + data.total,
    0
  );
  const overallCompleted = Object.values(aggregatedData).reduce(
    (sum, data) => sum + data.completed,
    0
  );
  const overallRate =
    overallTotal > 0 ? ((overallCompleted / overallTotal) * 100).toFixed(1) : 0;

  return (
    <Layout style={{ minHeight: "100vh", padding: "20px" }}>
      <Content>
        <Title level={2} style={{ textAlign: "center" }}>
          KDT 마케팅 대시보드
        </Title>
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
          {Object.keys(aggregatedData).map((trackName) => (
            <Col key={trackName} xs={24} sm={12} md={8}>
              <Card
                hoverable
                title={`KDT ${trackName} 대시보드`}
                onClick={() => navigate(`/track/${trackName}`)}
              >
                <p>
                  총 지원자: {aggregatedData[trackName].total}명<br />
                  작성완료: {aggregatedData[trackName].completed}명
                </p>
                <Button type="primary">자세히 보기</Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Content>
    </Layout>
  );
}

export default TopDashboard;
