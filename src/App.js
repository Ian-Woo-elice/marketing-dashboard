// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import TopDashboard from "./pages/TopDashboard";
import TrackDashboard from "./pages/TrackDashboard";
import BatchDashboard from "./pages/BatchDashboard";
import LoginPage from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <TopDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/track/:trackName/"
        element={
          <ProtectedRoute>
            <TrackDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/track/:trackName/batch/:batch"
        element={
          <ProtectedRoute>
            <BatchDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
