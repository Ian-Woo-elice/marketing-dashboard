// TrackDashboard.js

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Button,
  Divider,
  Space,
  message,
} from "antd";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Responsive, WidthProvider } from "react-grid-layout"; // import from react-grid-layout
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

// 정의: ResponsiveGridLayout 변수
const ResponsiveGridLayout = WidthProvider(Responsive);

const { Title } = Typography;
const { Header, Content } = Layout;

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
};

const doughnutOptionsBottom = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom" },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const value = ctx.parsed;
          const sum = ctx.dataset.data.reduce((acc, cur) => acc + cur, 0);
          const pct = sum > 0 ? ((value / sum) * 100).toFixed(1) : 0;
          return `${ctx.label}: ${value}명 (${pct}%)`;
        },
      },
    },
  },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
};

function TrackDashboard() {
  const { trackName } = useParams();
  const navigate = useNavigate();
  const batches = ["1", "2", "3"];

  const [aggregatedData, setAggregatedData] = useState([]);
  const [layouts, setLayouts] = useState({
    lg: [
      { i: "submissionTime", x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
      { i: "ageGroup", x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
      { i: "currentStatus", x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 3 },
      { i: "education", x: 0, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
      { i: "referralPath", x: 4, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
      { i: "dailyTrend", x: 8, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
    ],
  });

  // 각 기수 데이터 로드: 로컬스토리지에 "mergedData_{trackName}_{batch}" 키로 저장되어 있다고 가정
  const loadBatchData = (batch) => {
    const key = `mergedData_${trackName}_${batch}`;
    const stored = localStorage.getItem(key);
    try {
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      message.error(`Batch ${batch} 데이터 로드 에러`);
      return [];
    }
  };

  // 컴포넌트 마운트 시 각 기수 데이터를 모두 합산하여 aggregatedData에 저장
  useEffect(() => {
    let allData = [];
    batches.forEach((batch) => {
      const data = loadBatchData(batch);
      allData = allData.concat(data);
    });
    setAggregatedData(allData);
  }, [trackName]);

  // 전체 집계 계산
  const overallTotal = aggregatedData.length;
  const overallCompleted = aggregatedData.filter(
    (row) => row["모집 상태"] === "작성완료"
  ).length;
  const overallRate =
    overallTotal > 0 ? ((overallCompleted / overallTotal) * 100).toFixed(1) : 0;

  // 차트 데이터 함수들
  const getSubmissionTimeData = () => {
    const hourCount = Array(24).fill(0);
    aggregatedData.forEach((row) => {
      const time = new Date(row["제출시간"]);
      if (!isNaN(time)) hourCount[time.getHours()]++;
    });
    return {
      labels: hourCount.map((_, i) => `${i}시`),
      datasets: [{ label: "응답 수", data: hourCount, backgroundColor: "#1890ff" }],
    };
  };

  const getAgeGroupData = () => {
    const now = new Date();
    const ageGroups = { "19-24": 0, "25-29": 0, "30-35": 0, "36+": 0 };
    aggregatedData.forEach((row) => {
      const birth = row["생년월일"];
      if (!birth) return;
      const year = parseInt(birth.slice(0, 4));
      const age = now.getFullYear() - year;
      if (age >= 19 && age <= 24) ageGroups["19-24"]++;
      else if (age <= 29) ageGroups["25-29"]++;
      else if (age <= 35) ageGroups["30-35"]++;
      else ageGroups["36+"]++;
    });
    return {
      labels: Object.keys(ageGroups),
      datasets: [{
        label: "응답 수",
        data: Object.values(ageGroups),
        backgroundColor: "#52c41a"
      }],
    };
  };

  const getCategoryData = (field, categories, colors) => {
    const counts = categories.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    aggregatedData.forEach((row) => {
      const value = row[field]?.toLowerCase() || "";
      categories.forEach((key) => {
        if (value.includes(key.toLowerCase())) counts[key]++;
      });
    });
    return {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: colors }],
    };
  };

  const getDailyTrendData = () => {
    const dateCount = {};
    aggregatedData.forEach((row) => {
      const time = new Date(row["제출시간"]);
      if (!isNaN(time)) {
        const dateStr = time.toISOString().split("T")[0];
        dateCount[dateStr] = (dateCount[dateStr] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dateCount).sort();
    return {
      labels: sortedDates,
      datasets: [{
        label: "일별 지원자 수",
        data: sortedDates.map((date) => dateCount[date]),
        borderColor: "#faad14",
        backgroundColor: "rgba(250, 173, 20, 0.2)",
        fill: true,
      }],
    };
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ backgroundColor: "#fff", padding: "0 20px", boxShadow: "0 2px 8px #f0f1f2" }}>
      <Row align="middle" style={{ position: "relative" }}>
  <Col>
    <Button type="link" onClick={() => navigate(-1)}>
      ← 뒤로 가기
    </Button>
  </Col>
  <Col style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
    <Title level={3} style={{ margin: 0, color: "#000" }}>
      KDT {trackName} 대시보드
    </Title>
  </Col>
</Row>
      </Header>
      <Content style={{ padding: "20px", background: "#fdfdfd" }}>
        {/* 전체 집계 카드 */}
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

        <Divider orientation="left">차트 분석</Divider>
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={(currentLayout, allLayouts) => setLayouts(allLayouts)}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={150}
          margin={[20, 20]}
          containerPadding={[20, 20]}
          isDraggable={false}
          isResizable={false}
          autoSize={true}
        >
          <div key="submissionTime" style={{ background: "transparent" }}>
            <Card
              title="제출시간대 분포"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PNG 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PDF 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Bar
                  key={`submissionTime-${JSON.stringify(getSubmissionTimeData())}`}
                  data={getSubmissionTimeData()}
                  options={barOptions}
                />
              </div>
            </Card>
          </div>

          <div key="ageGroup" style={{ background: "transparent" }}>
            <Card
              title="연령대 분포"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PNG 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PDF 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Bar
                  key={`ageGroup-${JSON.stringify(getAgeGroupData())}`}
                  data={getAgeGroupData()}
                  options={barOptions}
                />
              </div>
            </Card>
          </div>

          <div key="currentStatus" style={{ background: "transparent" }}>
            <Card
              title="현재 신분 분포"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PNG 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PDF 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Doughnut
                  key={`currentStatus-${JSON.stringify(
                    getCategoryData(
                      "현재 신분",
                      ["졸업 예정", "졸업", "퇴사자", "취준생", "재학생", "기타"],
                      ["#1890ff", "#52c41a", "#faad14", "#13c2c2", "#722ed1", "#eb2f96"]
                    )
                  )}`}
                  data={getCategoryData(
                    "현재 신분",
                    ["졸업 예정", "졸업", "퇴사자", "취준생", "재학생", "기타"],
                    ["#1890ff", "#52c41a", "#faad14", "#13c2c2", "#722ed1", "#eb2f96"]
                  )}
                  options={doughnutOptionsBottom}
                />
              </div>
            </Card>
          </div>

          <div key="education" style={{ background: "transparent" }}>
            <Card
              title="최종학력 분포"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PNG 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PDF 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Doughnut
                  key={`education-${JSON.stringify(
                    getCategoryData(
                      "최종학력",
                      ["4년제", "3년제", "2년제", "대학원", "고등학교", "기타"],
                      ["#2f54eb", "#fa541c", "#52c41a", "#faad14", "#13c2c2", "#722ed1"]
                    )
                  )}`}
                  data={getCategoryData(
                    "최종학력",
                    ["4년제", "3년제", "2년제", "대학원", "고등학교", "기타"],
                    ["#2f54eb", "#fa541c", "#52c41a", "#faad14", "#13c2c2", "#722ed1"]
                  )}
                  options={doughnutOptionsBottom}
                />
              </div>
            </Card>
          </div>

          <div key="referralPath" style={{ background: "transparent" }}>
            <Card
              title="주요 유입 경로"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PNG 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PDF 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Doughnut
                  key={`referralPath-${JSON.stringify(
                    getCategoryData(
                      "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
                      ["홈페이지", "구글", "지인", "블로그", "인스타그램", "광고", "기타"],
                      ["#1890ff", "#13c2c2", "#52c41a", "#faad14", "#722ed1", "#eb2f96", "#fa541c"]
                    )
                  )}`}
                  data={getCategoryData(
                    "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
                    ["홈페이지", "구글", "지인", "블로그", "인스타그램", "광고", "기타"],
                    ["#1890ff", "#13c2c2", "#52c41a", "#faad14", "#722ed1", "#eb2f96", "#fa541c"]
                  )}
                  options={doughnutOptionsBottom}
                />
              </div>
            </Card>
          </div>

          <div key="dailyTrend" style={{ background: "transparent" }}>
            <Card
              title="일별 지원자 추이"
              extra={
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PNG 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      window.alert("PDF 다운로드 기능은 BatchDashboard에서 지원합니다.")
                    }
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Line
                  key={`dailyTrend-${JSON.stringify(getDailyTrendData())}`}
                  data={getDailyTrendData()}
                  options={lineOptions}
                />
              </div>
            </Card>
          </div>
        </ResponsiveGridLayout>

        <Divider orientation="left">개별 기수 대시보드</Divider>
        <Row gutter={[16, 16]}>
          {batches.map((batch) => {
            const batchData = loadBatchData(batch);
            const totalBatch = batchData ? batchData.length : 0;
const completedBatch = batchData
  ? batchData.filter((row) => row["모집 상태"] === "작성완료").length
  : 0;
            return (
              <Col key={batch} xs={24} sm={12} md={8}>
                <Card hoverable title={`KDT ${trackName} ${batch}기 대시보드`}>
                  <p>
                    지원자: {totalBatch}명<br />
                    작성완료: {completedBatch}명
                  </p>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/track/${trackName}/batch/${batch}`)}
                  >
                    자세히 보기
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Content>
    </Layout>
  );
}

export default TrackDashboard;
