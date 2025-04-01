// BatchDashboard.js

import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Card, Typography, Button, Upload, message, Table, Checkbox } from "antd";
import { Bar, Doughnut } from "react-chartjs-2";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Chart.js v3 이상에서는 필요한 스케일, 엘리먼트, 툴팁, 범례 등을 명시적으로 등록해줘야 함
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const { Title } = Typography;
const { Content } = Layout;

/** PNG/PDF 차트 다운로드 */
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

function BatchDashboard() {
  const { trackName = "트랙명 없음", batch = "기수 없음" } = useParams();
  const navigate = useNavigate();

  // 통합된 엑셀 데이터
  const [mergedData, setMergedData] = useState([]);
  // 파일 업로드 관련
  const [fileList, setFileList] = useState([]);
  // 오류 메시지
  const [errorMessage, setErrorMessage] = useState("");

  // 체크된 surveyID 목록 (집계에서 제외)
  const [excludedSurveyIds, setExcludedSurveyIds] = useState([]);

  // 차트 ref
  const chartRefs = {
    submissionTime: useRef(null),
    ageGroup: useRef(null),
    currentStatus: useRef(null),
    education: useRef(null),
    referralPath: useRef(null),
  };

  // GridLayout 설정
  const layout = [
    { i: "submissionTime", x: 0, y: 0, w: 6, h: 3 },
    { i: "ageGroup", x: 6, y: 0, w: 6, h: 3 },
    { i: "currentStatus", x: 0, y: 3, w: 6, h: 3 },
    { i: "education", x: 6, y: 3, w: 6, h: 3 },
    { i: "referralPath", x: 0, y: 6, w: 12, h: 3 },
  ];

  /** 제외 체크 상태를 localStorage에서 불러오기 */
  useEffect(() => {
    const saved = localStorage.getItem("excludedSurveyIds");
    if (saved) {
      setExcludedSurveyIds(JSON.parse(saved));
    }
  }, []);

  /** 제외 체크 상태가 바뀔 때마다 localStorage에 저장 */
  useEffect(() => {
    localStorage.setItem("excludedSurveyIds", JSON.stringify(excludedSurveyIds));
  }, [excludedSurveyIds]);

  /** 파일 읽기 함수 */
  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
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
  };

  /** 파일 업로드 핸들러 */
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

      // 추가 정보 병합
      const pivotedStatus = {};
      additionalRaw.forEach((row) => {
        const id = row.surveyResponseId;
        if (!id) return;
        if (!pivotedStatus[id]) pivotedStatus[id] = {};
        if (row.title && row["MAX(questionResponse)"] !== undefined) {
          pivotedStatus[id][row.title] = parseQuestion(row["MAX(questionResponse)"]);
        }
      });

      // surveyRaw + pivotedStatus 병합
      const finalData = surveyRaw.map((row) => {
        const id = row.surveyResponseId;
        const 모집상태 = row["모집 상태"]?.trim() || "작성중";
        return {
          ...row,
          ...(pivotedStatus[id] || {}),
          "모집 상태": 모집상태,
        };
      });

      setMergedData(finalData);
    } catch (err) {
      console.error(err);
      setErrorMessage(`병합 중 오류: ${err.message}`);
    }
  };

  /** JSON 파싱 */
  const parseQuestion = (val) => {
    if (!val) return "";
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.join(", ");
      if (typeof parsed === "object") return Object.values(parsed).join(" / ");
      return parsed;
    } catch {
      return val;
    }
  };

  /** 차트 데이터 생성 */
  const chartData = (labels, data, backgroundColor = "#8e2de2") => ({
    labels,
    datasets: [
      {
        label: "응답 수",
        data,
        backgroundColor,
      },
    ],
  });

  /** Bar 차트 옵션 */
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  /** Doughnut 차트 옵션 */
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
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

  /** 제출시간대 분포 */
  const getSubmissionTimeData = () => {
    const hourCount = Array(24).fill(0);
    mergedData.forEach((row) => {
      const time = new Date(row["제출시간"]);
      if (!isNaN(time)) {
        hourCount[time.getHours()]++;
      }
    });
    return chartData(hourCount.map((_, i) => `${i}시`), hourCount);
  };

  /** 연령대 분포 */
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
    return chartData(Object.keys(ageGroups), Object.values(ageGroups), "#4a00e0");
  };

  /** 특정 필드에 대해 지정된 카테고리 배열을 count */
  const getCategoryData = (field, categories) => {
    const counts = categories.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    mergedData.forEach((row) => {
      const value = row[field]?.toLowerCase() || "";
      categories.forEach((key) => {
        if (value.includes(key.toLowerCase())) {
          counts[key]++;
        }
      });
    });
    return {
      labels: Object.keys(counts),
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: [
            "#8e2de2",
            "#4a00e0",
            "#b266ff",
            "#a64ca6",
            "#cc66ff",
            "#9933ff",
          ],
        },
      ],
    };
  };

  /** .xlsx 다운로드 (테이블 전체) */
  const handleDownloadTableExcel = () => {
    const ws = XLSX.utils.json_to_sheet(mergedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, "table_data.xlsx");
  };

  /** 체크박스 토글 (집계 제외) */
  const handleExcludeChange = (surveyID) => {
    if (!surveyID) return;
    if (excludedSurveyIds.includes(surveyID)) {
      setExcludedSurveyIds(excludedSurveyIds.filter((id) => id !== surveyID));
    } else {
      setExcludedSurveyIds([...excludedSurveyIds, surveyID]);
    }
  };

  /** 열 필터용 유틸 */
  const uniqueValuesFor = (field) => {
    const set = new Set();
    mergedData.forEach((row) => {
      if (row[field]) set.add(row[field]);
    });
    return [...set].map((val) => ({ text: val, value: val }));
  };

  /** KPI 계산 시 제외된 surveyID는 집계에서 제외 */
  const displayedData = mergedData.filter(
    (row) => !excludedSurveyIds.includes(row.surveyID)
  );
  const totalApplicants = displayedData.length || 0;
  const completedCount = displayedData.filter(
    (row) => row["모집 상태"] === "작성완료"
  ).length;
  const completionRate =
    totalApplicants > 0 ? ((completedCount / totalApplicants) * 100).toFixed(1) : 0;

  /** 테이블 열 정의 (원하는 순서대로) */
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
            <Checkbox
              checked={checked}
              onChange={() => handleExcludeChange(record.surveyID)}
            />
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
      title: "교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? ",
      dataIndex: "교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? ",
      key: "주의사항",
      ellipsis: true,
      filters: uniqueValuesFor("교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? "),
      onFilter: (value, record) =>
        record["교육 신청 전 주의 사항을 꼼꼼히 확인하셨나요? "] === value,
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
      title: "지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)",
      dataIndex: "지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)",
      key: "지원 동기",
      ellipsis: true,
      filters: uniqueValuesFor("지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)"),
      onFilter: (value, record) =>
        record["지원 동기와 취업 목표에 대해서 기재해 주세요. (300자 이상)"] === value,
    },
    {
      title: "내일배움카드를 보유하고 계신가요?",
      dataIndex: "내일배움카드를 보유하고 계신가요?",
      key: "내일배움카드",
      ellipsis: true,
      filters: uniqueValuesFor("내일배움카드를 보유하고 계신가요?"),
      onFilter: (value, record) =>
        record["내일배움카드를 보유하고 계신가요?"] === value,
    },
    {
      title: "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
      dataIndex: "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
      key: "유입경로",
      ellipsis: true,
      filters: uniqueValuesFor("엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)"),
      onFilter: (value, record) =>
        record["엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)"] === value,
    },
    {
      title: "아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?",
      dataIndex: "아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?",
      key: "개인정보동의",
      ellipsis: true,
      filters: uniqueValuesFor("아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?"),
      onFilter: (value, record) =>
        record["아래와 같이 귀하의 개인정보를 수집·이용·제공하는 것에 동의합니까?"] === value,
    },
  ];

  return (
    <Layout
      style={{
        minHeight: "100vh",
        padding: "20px",
        background: "linear-gradient(to right, #8e2de2, #4a00e0)",
      }}
    >
      <Content style={{ background: "#fff", borderRadius: "8px", padding: "20px" }}>
        <Button
          onClick={() => navigate(-1)}
          style={{ marginBottom: "20px", background: "#8e2de2", color: "white" }}
        >
          ← 뒤로 가기
        </Button>
        <Title level={2} style={{ textAlign: "center", color: "#4a00e0" }}>
          KDT {trackName} {batch}기 대시보드
        </Title>

        <Upload
          multiple
          accept=".xlsx"
          beforeUpload={() => false}
          onChange={handleUpload}
          fileList={fileList}
        >
          <Button type="primary" style={{ marginBottom: "20px", background: "#4a00e0" }}>
            엑셀 파일 업로드
          </Button>
        </Upload>

        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

        {/* KPI 카드 (체크된 행 제외) */}
        <Card style={{ marginBottom: "20px", borderColor: "#8e2de2" }}>
          <p>
            전체 지원자 (제외 제외): <strong>{totalApplicants}</strong>명
            <br />
            작성완료: <strong>{completedCount}</strong>명
            <br />
            완료율: <strong>{completionRate}%</strong>
          </p>
        </Card>

        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={150}
          width={1200}
          isDraggable={true}
          isResizable={true}
        >
          <div key="submissionTime">
            <Card
              title="제출시간대 분포"
              extra={
                <>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.submissionTime, "png", "submissionTime")}
                    style={{ marginRight: 4 }}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.submissionTime, "pdf", "submissionTime")}
                  >
                    PDF
                  </Button>
                </>
              }
            >
              <Bar
                key={`submissionTime-${JSON.stringify(getSubmissionTimeData())}`}
                redraw
                ref={chartRefs.submissionTime}
                data={getSubmissionTimeData()}
                options={barOptions}
              />
            </Card>
          </div>

          <div key="ageGroup">
            <Card
              title="연령대 분포"
              extra={
                <>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.ageGroup, "png", "ageGroup")}
                    style={{ marginRight: 4 }}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.ageGroup, "pdf", "ageGroup")}
                  >
                    PDF
                  </Button>
                </>
              }
            >
              <Bar
                key={`ageGroup-${JSON.stringify(getAgeGroupData())}`}
                redraw
                ref={chartRefs.ageGroup}
                data={getAgeGroupData()}
                options={barOptions}
              />
            </Card>
          </div>

          <div key="currentStatus">
            <Card
              title="현재 신분 분포"
              extra={
                <>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.currentStatus, "png", "currentStatus")}
                    style={{ marginRight: 4 }}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.currentStatus, "pdf", "currentStatus")}
                  >
                    PDF
                  </Button>
                </>
              }
            >
              <Doughnut
                key={`currentStatus-${JSON.stringify(
                  getCategoryData("현재 신분", [
                    "졸업 예정",
                    "졸업",
                    "퇴사자",
                    "취준생",
                    "재학생",
                    "기타",
                  ])
                )}`}
                redraw
                ref={chartRefs.currentStatus}
                data={getCategoryData("현재 신분", [
                  "졸업 예정",
                  "졸업",
                  "퇴사자",
                  "취준생",
                  "재학생",
                  "기타",
                ])}
                options={doughnutOptions}
              />
            </Card>
          </div>

          <div key="education">
            <Card
              title="최종학력 분포"
              extra={
                <>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.education, "png", "education")}
                    style={{ marginRight: 4 }}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.education, "pdf", "education")}
                  >
                    PDF
                  </Button>
                </>
              }
            >
              <Doughnut
                key={`education-${JSON.stringify(
                  getCategoryData("최종학력", [
                    "4년제",
                    "3년제",
                    "2년제",
                    "대학원",
                    "고등학교",
                    "기타",
                  ])
                )}`}
                redraw
                ref={chartRefs.education}
                data={getCategoryData("최종학력", [
                  "4년제",
                  "3년제",
                  "2년제",
                  "대학원",
                  "고등학교",
                  "기타",
                ])}
                options={doughnutOptions}
              />
            </Card>
          </div>

          <div key="referralPath">
            <Card
              title="주요 유입 경로"
              extra={
                <>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.referralPath, "png", "referralPath")}
                    style={{ marginRight: 4 }}
                  >
                    PNG
                  </Button>
                  <Button
                    size="small"
                    onClick={() => downloadChart(chartRefs.referralPath, "pdf", "referralPath")}
                  >
                    PDF
                  </Button>
                </>
              }
            >
              <Doughnut
                key={`referralPath-${JSON.stringify(
                  getCategoryData(
                    "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
                    ["홈페이지", "구글", "지인", "블로그", "인스타그램", "광고", "기타"]
                  )
                )}`}
                redraw
                ref={chartRefs.referralPath}
                data={getCategoryData(
                  "엘리스 트랙을 어떻게 알게 되셨나요? (*복수 선택 가능)",
                  ["홈페이지", "구글", "지인", "블로그", "인스타그램", "광고", "기타"]
                )}
                options={doughnutOptions}
              />
            </Card>
          </div>
        </GridLayout>

        {/* 지원자 상세 테이블 */}
        <Card
          title={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>지원자 상세 테이블</span>
              <Button type="primary" onClick={handleDownloadTableExcel}>
                엑셀 다운로드
              </Button>
            </div>
          }
          style={{ marginTop: "40px" }}
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
