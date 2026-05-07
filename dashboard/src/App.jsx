import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import OverviewPage from './pages/Overview';
import ParticipantsPage from './pages/ParticipantsPage';
import SpeakersPage from './pages/SpeakersPage';
import SponsorsPage from './pages/SponsorsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SessionsPage from './pages/SessionsPage';
import SettingsPage from './pages/SettingsPage';
import TemplateDesigner from './pages/TemplateDesigner';
import SelfServicePage from './pages/SelfServicePage';
import AdminDashboard from './pages/AdminDashboard';
import ModerationPage from './pages/ModerationPage';
import SocialWallPage from './pages/SocialWallPage';
import PublicDisplay from './pages/PublicDisplay';
import HardwareManagement from './pages/HardwareManagement';
import DeveloperPortal from './pages/DeveloperPortal';
import ParticipantPortal from './pages/ParticipantPortal';
import CheckInPage from './pages/CheckInPage';
import PollsPage from './pages/PollsPage';
import QuestionsPage from './pages/QuestionsPage';
import EventsPage from './pages/EventsPage';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import RequestDemo from './pages/RequestDemo';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import OrganizerManagement from './pages/SuperAdmin/Organizers';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SuperAdminPlans from './pages/SuperAdmin/Plans';
import SuperAdminSettings from './pages/SuperAdmin/Settings';

/**
 * مكون لحماية المسارات — يدعم التحقق من التوكن والأدوار (RBAC).
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('diwan_token');
  const user = JSON.parse(localStorage.getItem('diwan_user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // إذا كان المطلوب رتبة معينة والمستخدم ليس هو تلك الرتبة وليس سوبر أدمن
  if (requiredRole && user.role !== requiredRole && user.role !== 'super_admin') {
    if (user.role === 'organizer') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* ═══ المسارات العامة ═══ */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/request-demo" element={<RequestDemo />} />
      
      {/* ═══ المسارات المحمية (لوحة التحكم) ═══ */}
      <Route path="/dashboard" element={
        <ProtectedRoute><OverviewPage /></ProtectedRoute>
      } />
      
      <Route path="/dashboard/participants" element={
        <ProtectedRoute><ParticipantsPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/check-in" element={
        <ProtectedRoute><CheckInPage /></ProtectedRoute>
      } />
      
      <Route path="/dashboard/sessions" element={
        <ProtectedRoute><SessionsPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/speakers" element={
        <ProtectedRoute><SpeakersPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/sponsors" element={
        <ProtectedRoute><SponsorsPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/stats" element={
        <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/polls" element={
        <ProtectedRoute><PollsPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
      <Route path="/dashboard/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      
      <Route path="/dashboard/moderation" element={
        <ProtectedRoute><ModerationPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/wall" element={
        <ProtectedRoute><SocialWallPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/display" element={
        <ProtectedRoute><PublicDisplay /></ProtectedRoute>
      } />

      <Route path="/dashboard/hardware" element={
        <ProtectedRoute><HardwareManagement /></ProtectedRoute>
      } />

      <Route path="/dashboard/developer" element={
        <ProtectedRoute><DeveloperPortal /></ProtectedRoute>
      } />

      <Route path="/dashboard/settings" element={
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      } />

      <Route path="/dashboard/designer" element={
        <ProtectedRoute><TemplateDesigner /></ProtectedRoute>
      } />

      {/* ═══ المسارات العامة (بدون مصادقة) ═══ */}
      <Route path="/p/:eid/:pid" element={<ParticipantPortal />} />
      <Route path="/kiosk/:eid" element={<SelfServicePage />} />
      <Route path="/kiosk" element={<SelfServicePage />} />
      <Route path="/display/:eid" element={<PublicDisplay />} />
      <Route path="/register/:eid" element={<RegisterPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ═══ بوابة الإدارة الشاملة (Super Admin Only) ═══ */}
      <Route path="/super-admin" element={
        <ProtectedRoute requiredRole="super_admin">
          <SuperAdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="organizers" element={<OrganizerManagement />} />
        <Route path="plans" element={<SuperAdminPlans />} />
        <Route path="settings" element={<SuperAdminSettings />} />
      </Route>

      {/* ═══ التوجيهات التلقائية ═══ */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
