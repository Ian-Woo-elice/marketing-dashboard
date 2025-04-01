// BatchDashboard.js

import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Layout,
  Card,
  Typography,
  Button,
  Upload,
  message,
  Table,
  Checkbox,
  Row,
  Col,
  Divider,
  Space,
} from "antd";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { Responsive, WidthProvider } from "react-grid-layout";
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

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title } = Typography;
const { Header, Content } = Layout;

/** PNG/PDF 차트 다운로드 함수 */
function downloadChart(ref, format, title) {
  if (!ref?.current) return;
  const base64 = ref.current.toBase64Image();
  if (format === "png") {
    const link = document.createElement("a");
    link.href = base64;
    link.download = `${title}.png`;
    link.click();
  } else {
    const pdf = new jsPDF("l", "pt", "a4");
    pdf.addImage(base64, "PNG", 40, 40, 720, 400);
    pdf.save(`${title}.pdf`);
  }
}

/** Bar 차트 옵션 */
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
};

/** Doughnut 차트 옵션 (범례를 하단에 배치) */
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

/** Line 차트 옵션 (일별 지원자 추이) */
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
};

function BatchDashboard() {
  const { trackName = "자율주행", batch = "3" } = useParams();
  const navigate = useNavigate();

  // 통합 엑셀 데이터, 파일, 오류, 제외 surveyID, 편집 모드
  const [mergedData, setMergedData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [excludedSurveyIds, setExcludedSurveyIds] = useState([]);
  const [editMode, setEditMode] = useState(false);

  // 반응형 레이아웃 설정 (각 카드 최소 크기 포함)
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

  // 차트 ref
  const chartRefs = {
    submissionTime: useRef(null),
    ageGroup: useRef(null),
    currentStatus: useRef(null),
    education: useRef(null),
    referralPath: useRef(null),
    dailyTrend: useRef(null),
  };

  useEffect(() => {
    const saved = localStorage.getItem("excludedSurveyIds");
    if (saved) setExcludedSurveyIds(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("excludedSurveyIds", JSON.stringify(excludedSurveyIds));
  }, [excludedSurveyIds]);

  const readExcel = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: "binary" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(sheet);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });

  const handleUpload = async ({ fileList }) => {
    setFileList(fileList);
    if (fileList.length !== 2) {
      message.warning("xlsx 파일 2개를 동시에 업로드해주세요.");
      return;
    }
    try {
      const [surveyRaw, additionalRaw] = await Promise.all([
        readExcel(fileList[0].originFileObj),
        readExcel(fileList[1].originFileObj),
      ]);

      const pivotedStatus = {};
      additionalRaw.forEach((row) => {
        const id = row.surveyResponseId;
        if (!id) return;
        if (!pivotedStatus[id]) pivotedStatus[id] = {};
        if (row.title && row["MAX(questionResponse)"] !== undefined) {
          pivotedStatus[id][row.title] = parseQuestion(row["MAX(questionResponse)"]);
        }
      });

      const finalData = surveyRaw.map((row) => {
        const id = row.surveyResponseId;
        const 모집상태 = row["모집 상태"]?.trim() || "작성중";
        return { ...row, ...(pivotedStatus[id] || {}), "모집 상태": 모집상태 };
      });

      setMergedData(finalData);
    } catch (err) {
      console.error(err);
      setErrorMessage(`병합 중 오류: ${err.message}`);
    }
  };

  const parseQuestion = (val) => {
    if (!val) return "";
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed)
        ? parsed.join(", ")
        : typeof parsed === "object"
        ? Object.values(parsed).join(" / ")
        : parsed;
    } catch {
      return val;
    }
  };

  // 차트 데이터 함수들
  const getSubmissionTimeData = () => {
    const hourCount = Array(24).fill(0);
    mergedData.forEach((row) => {
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
    mergedData.forEach((row) => {
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
      datasets: [{ label: "응답 수", data: Object.values(ageGroups), backgroundColor: "#52c41a" }],
    };
  };

  // getCategoryData: colors 매개변수를 추가하여 각 차트별 색상 지정
  const getCategoryData = (field, categories, colors) => {
    const counts = categories.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    mergedData.forEach((row) => {
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
    mergedData.forEach((row) => {
      const time = new Date(row["제출시간"]);
      if (!isNaN(time)) {
        const dateStr = time.toISOString().split("T")[0];
        dateCount[dateStr] = (dateCount[dateStr] || 0) + 1;
      }
    });
    const sortedDates = Object.keys(dateCount).sort();
    return {
      labels: sortedDates,
      datasets: [
        {
          label: "일별 지원자 수",
          data: sortedDates.map((date) => dateCount[date]),
          borderColor: "#faad14",
          backgroundColor: "rgba(250, 173, 20, 0.2)",
          fill: true,
        },
      ],
    };
  };

  const handleDownloadTableExcel = () => {
    const ws = XLSX.utils.json_to_sheet(mergedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "table_data.xlsx");
  };

  const handleExcludeChange = (surveyID) => {
    if (!surveyID) return;
    excludedSurveyIds.includes(surveyID)
      ? setExcludedSurveyIds(excludedSurveyIds.filter((id) => id !== surveyID))
      : setExcludedSurveyIds([...excludedSurveyIds, surveyID]);
  };

  const uniqueValuesFor = (field) => {
    const set = new Set();
    mergedData.forEach((row) => {
      if (row[field]) set.add(row[field]);
    });
    return [...set].map((val) => ({ text: val, value: val }));
  };

  const displayedData = mergedData.filter((row) => !excludedSurveyIds.includes(row.surveyID));
  const totalApplicants = displayedData.length || 0;
  const completedCount = displayedData.filter((row) => row["모집 상태"] === "작성완료").length;
  const completionRate = totalApplicants > 0 ? ((completedCount / totalApplicants) * 100).toFixed(1) : 0;

  const tableColumns = [
    {
      title: "제외",
      dataIndex: "excludeDummy",
      key: "excludeDummy",
      width: 60,
      render: (_, record) => {
        const checked = excludedSurveyIds.includes(record.surveyID);
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={checked} onChange={() => handleExcludeChange(record.surveyID)} />
          </div>
        );
      },
    },
    {
      title: "surveyID",
      dataIndex: "surveyID",
      key: "surveyID",
      ellipsis: true,
      filters: uniqueValuesFor("surveyID"),
      onFilter: (value, record) => record.surveyID === value,
    },
    {
      title: "지원 트랙",
      dataIndex: "지원 트랙",
      key: "지원 트랙",
      ellipsis: true,
      filters: uniqueValuesFor("지원 트랙"),
      onFilter: (value, record) => record["지원 트랙"] === value,
    },
    {
      title: "모집 상태",
      dataIndex: "모집 상태",
      key: "모집 상태",
      ellipsis: true,
      filters: uniqueValuesFor("모집 상태"),
      onFilter: (value, record) => record["모집 상태"] === value,
    },
    {
      title: "제출시간",
      dataIndex: "제출시간",
      key: "제출시간",
      ellipsis: true,
      filters: uniqueValuesFor("제출시간"),
      onFilter: (value, record) => record["제출시간"] === value,
    },
    {
      title: "이름",
      dataIndex: "이름",
      key: "이름",
      ellipsis: true,
      filters: uniqueValuesFor("이름"),
      onFilter: (value, record) => record["이름"] === value,
    },
    {
      title: "전화번호",
      dataIndex: "전화번호",
      key: "전화번호",
      ellipsis: true,
      filters: uniqueValuesFor("전화번호"),
      onFilter: (value, record) => record["전화번호"] === value,
    },
    {
      title: "이메일",
      dataIndex: "이메일",
      key: "이메일",
      ellipsis: true,
      filters: uniqueValuesFor("이메일"),
      onFilter: (value, record) => record["이메일"] === value,
    },
    {
      title: "생년월일",
      dataIndex: "생년월일",
      key: "생년월일",
      ellipsis: true,
      filters: uniqueValuesFor("생년월일"),
      onFilter: (value, record) => record["생년월일"] === value,
    },
    {
      title: "최종학력",
      dataIndex: "최종학력",
      key: "최종학력",
      ellipsis: true,
      filters: uniqueValuesFor("최종학력"),
      onFilter: (value, record) => record["최종학력"] === value,
    },
    {
      title: "현재 신분",
      dataIndex: "현재 신분",
      key: "현재 신분",
      ellipsis: true,
      filters: uniqueValuesFor("현재 신분"),
      onFilter: (value, record) => record["현재 신분"] === value,
    },
    {
      title: "주의사항",
      dataIndex: "교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? ",
      key: "주의사항",
      ellipsis: true,
      filters: uniqueValuesFor("교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? "),
      onFilter: (value, record) => record["교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? "] === value,
    },
    {
      title: "개발 학습 기간",
      dataIndex: "개발 학습 기간",
      key: "개발 학습 기간",
      ellipsis: true,
      filters: uniqueValuesFor("개발 학습 기간"),
      onFilter: (value, record) => record["개발 학습 기간"] === value,
    },
    {
      title: "지원 동기",
      dataIndex: "지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)",
      key: "지원 동기",
      ellipsis: true,
      filters: uniqueValuesFor("지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)"),
      onFilter: (value, record) =>
        record["지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)"] === value,
    },
    {
      title: "내일배움카드",
      dataIndex: "내일배움카드를 보유하고 계신가요?",
      key: "내일배움카드",
      ellipsis: true,
      filters: uniqueValuesFor("내일배움카드를 보유하고 계신가요?"),
      onFilter: (value, record) => record["내일배움카드를 보유하고 계신가요?"] === value,
    },
    {
      title: "유입경로",
      dataIndex: "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
      key: "유입경로",
      ellipsis: true,
      filters: uniqueValuesFor("엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)"),
      onFilter: (value, record) =>
        record["엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)"] === value,
    },
    {
      title: "개인정보동의",
      dataIndex: "아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?",
      key: "개인정보동의",
      ellipsis: true,
      filters: uniqueValuesFor("아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?"),
      onFilter: (value, record) =>
        record["아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?"] === value,
    },
  ];

  const onLayoutChange = (currentLayout, allLayouts) => setLayouts(allLayouts);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          backgroundColor: "#fff",
          padding: "0 20px",
          boxShadow: "0 2px 8px #f0f1f2",
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Button type="link" onClick={() => navigate(-1)}>
              ← 뒤로 가기
            </Button>
          </Col>
          <Col>
            <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
              KDT 자율주행 {batch}기 대시보드
            </Title>
          </Col>
          <Col>
            <Button onClick={() => setEditMode(!editMode)}>
              {editMode ? "편집 완료" : "편집"}
            </Button>
          </Col>
        </Row>
      </Header>
      <Content style={{ padding: "20px", background: "#fdfdfd" }}>
        <Card style={{ marginBottom: "20px" }}>
          <Upload
            multiple
            accept=".xlsx"
            beforeUpload={() => false}
            onChange={handleUpload}
            fileList={fileList}
          >
            <Button type="primary">엑셀 파일 업로드</Button>
          </Upload>
          {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        </Card>

        <Card style={{ marginBottom: "20px" }}>
          <p>
            전체 지원자 (제외 제외): <strong>{totalApplicants}</strong>명&nbsp;&nbsp;
            작성완료: <strong>{completedCount}</strong>명&nbsp;&nbsp;
            완료율: <strong>{completionRate}%</strong>
          </p>
        </Card>

        <Divider orientation="left">차트 분석</Divider>

        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={onLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={150}
          margin={[20, 20]}
          containerPadding={[20, 20]}
          isDraggable={editMode}
          isResizable={editMode}
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
                      downloadChart(chartRefs.submissionTime, "png", "submissionTime")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      downloadChart(chartRefs.submissionTime, "pdf", "submissionTime")
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
                  redraw
                  ref={chartRefs.submissionTime}
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
                    onClick={() => downloadChart(chartRefs.ageGroup, "png", "ageGroup")}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.ageGroup, "pdf", "ageGroup")}
                  >
                    PDF
                  </Button>
                </Space>
              }
            >
              <div style={{ height: 300 }}>
                <Bar
                  key={`ageGroup-${JSON.stringify(getAgeGroupData())}`}
                  redraw
                  ref={chartRefs.ageGroup}
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
                      downloadChart(chartRefs.currentStatus, "png", "currentStatus")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      downloadChart(chartRefs.currentStatus, "pdf", "currentStatus")
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
                  redraw
                  ref={chartRefs.currentStatus}
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
                    onClick={() => downloadChart(chartRefs.education, "png", "education")}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.education, "pdf", "education")}
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
                  redraw
                  ref={chartRefs.education}
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
                      downloadChart(chartRefs.referralPath, "png", "referralPath")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      downloadChart(chartRefs.referralPath, "pdf", "referralPath")
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
                  redraw
                  ref={chartRefs.referralPath}
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
                      downloadChart(chartRefs.dailyTrend, "png", "dailyTrend")
                    }
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      downloadChart(chartRefs.dailyTrend, "pdf", "dailyTrend")
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
                  redraw
                  ref={chartRefs.dailyTrend}
                  data={getDailyTrendData()}
                  options={lineOptions}
                />
              </div>
            </Card>
          </div>
        </ResponsiveGridLayout>

        <Divider orientation="left">지원자 상세 테이블</Divider>
        <Card
          title={
            <Row justify="space-between" align="middle">
              <Col>지원자 상세 테이블</Col>
              <Col>
                <Button type="primary" onClick={handleDownloadTableExcel}>
                  엑셀 다운로드
                </Button>
              </Col>
            </Row>
          }
        >
          <Table
            dataSource={mergedData}
            columns={tableColumns}
            rowKey={(row, idx) => idx}
            size="small"
            pagination={false}
            scroll={{ x: 1200, y: 400 }}
          />
        </Card>
      </Content>
    </Layout>
  );
}

export default BatchDashboard;
