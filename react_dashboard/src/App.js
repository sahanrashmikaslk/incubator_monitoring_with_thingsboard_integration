import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Login from './components/Auth/Login';
import StaffSignup from './components/Auth/StaffSignup';
import SetupPassword from './components/SetupPassword/SetupPassword';
import ParentPortal from './components/Parent/ParentPortal';
import ParentRegistration from './components/Parent/ParentRegistration';
import ClinicalDashboard from './components/Clinical/ClinicalDashboard';
import AdminPanel from './components/Admin/AdminPanel';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/staff-signup" element={<StaffSignup />} />
            <Route path="/setup-password" element={<SetupPassword />} />
            <Route path="/parent/register/:code" element={<ParentRegistration />} />
            
            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentPortal />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/clinical"
              element={
                <ProtectedRoute allowedRoles={['doctor', 'nurse']}>
                  <ClinicalDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
