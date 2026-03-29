import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Surveillance from './pages/Surveillance';
import EnhancementLab from './pages/EnhancementLab';
import DetectionRecords from './pages/DetectionRecords';
import SystemLogs from './pages/SystemLogs';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import ReportsDetail from './pages/ReportsDetail';
import ConnectionTest from './pages/ConnectionTest';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/test-connection" element={<ConnectionTest />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } /> 
        <Route path="/surveillance" element={
          <ProtectedRoute requiredRole="surveillance_head">
            <Surveillance />
          </ProtectedRoute>
        } />
        <Route path="/enhancement-lab" element={
          <ProtectedRoute requiredRole="engineer">
            <EnhancementLab />
          </ProtectedRoute>
        } />
        <Route path="/detection-records" element={
          <ProtectedRoute>
            <DetectionRecords />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute requiredRole="surveillance_head">
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="/reports/detail" element={
          <ProtectedRoute requiredRole="surveillance_head">
            <ReportsDetail />
          </ProtectedRoute>
        } />
        <Route path="/system-logs" element={
          <ProtectedRoute requiredRole="engineer">
            <SystemLogs />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;