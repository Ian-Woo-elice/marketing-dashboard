import React from "react";
import { Routes, Route } from "react-router-dom";
import TopDashboard from "./pages/TopDashboard";
import TrackDashboard from "./pages/TrackDashboard";
import BatchDashboard from "./pages/BatchDashboard";

function App() {
  return (
    <Routes>
      {/* 최상위 페이지 */}
      <Route path="/" element={<TopDashboard />} />

      {/* 하위 페이지 : 각 트랙별 대시보드 */}
      <Route path="/track/:trackName" element={<TrackDashboard />} />

      {/* 최하위 페이지 : 각 트랙의 기수별 대시보드 */}
      <Route path="/track/:trackName/batch/:batch" element={<BatchDashboard />} />
    </Routes>
  );
}

export default App;
