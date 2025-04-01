import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Card, Row, Col, Typography, Button } from "antd";

const { Title } = Typography;
const { Content } = Layout;

// 더미 데이터: 각 트랙별 기수 데이터
// 실제 서비스에서는 API 호출로 받아올 수 있습니다.
const trackBatchData = {
  자율주행: {
    "1": { total: 100, completed: 60 },
    "2": { total: 120, completed: 80 },
    "3": { total: 90, completed: 50 },
  },
  인공지능: {
    "1": { total: 80, completed: 50 },
    "2": { total: 110, completed: 70 },
    "3": { total: 95, completed: 55 },
  },
  모바일: {
    "1": { total: 130, completed: 90 },
    "2": { total: 140, completed: 100 },
    "3": { total: 120, completed: 80 },
  },
};

function TrackDashboard() {
  const { trackName } = useParams();
  const navigate = useNavigate();

  const batches = trackBatchData[trackName] || { "1": {}, "2": {}, "3": {} };

  // 집계: 모든 기수 데이터 합산
  const total = Object.values(batches).reduce(
    (sum, data) => sum + (data.total || 0),
    0
  );
  const completed = Object.values(batches).reduce(
    (sum, data) => sum + (data.completed || 0),
    0
  );
  const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

  return (
    <Layout style={{ minHeight: "100vh", padding: "20px" }}>
      <Content>
        <Button onClick={() => navigate(-1)} style={{ marginBottom: "20px" }}>
          ← 뒤로 가기
        </Button>
        <Title level={2} style={{ textAlign: "center" }}>
          KDT {trackName} 대시보드
        </Title>
        <Card style={{ marginBottom: "20px" }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card>
                <Title level={4}>전체 지원자 수</Title>
                <Title level={3}>{total}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Title level={4}>작성완료 수</Title>
                <Title level={3}>{completed}</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Title level={4}>작성완료율</Title>
                <Title level={3}>{rate}%</Title>
              </Card>
            </Col>
          </Row>
        </Card>
        <Row gutter={[16, 16]}>
          {["1", "2", "3"].map((batch) => (
            <Col key={batch} xs={24} sm={12} md={8}>
              <Card
                hoverable
                title={`KDT ${trackName} ${batch}기 대시보드`}
                onClick={() => navigate(`/track/${trackName}/batch/${batch}`)}
              >
                <p>
                  지원자: {batches[batch]?.total || 0}명<br />
                  작성완료: {batches[batch]?.completed || 0}명
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

export default TrackDashboard;
