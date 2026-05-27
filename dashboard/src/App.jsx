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
import BadgeDesigner from './pages/BadgeDesigner';
import CertificateDesigner from './pages/CertificateDesigner';
import SelfServicePage from './pages/SelfServicePage';
import AdminDashboard from './pages/AdminDashboard';
import ModerationPage from './pages/ModerationPage';
import SocialWallPage from './pages/SocialWallPage';
import PublicDisplay from './pages/PublicDisplay';
import DisplayControlPage from './pages/DisplayControlPage';
import HardwareManagement from './pages/HardwareManagement';
import DeveloperPortal from './pages/DeveloperPortal';
import ApiDocsPage from './pages/ApiDocsPage';
import ParticipantPortal from './pages/ParticipantPortal';
import CheckInPage from './pages/CheckInPage';
import PollsPage from './pages/PollsPage';
import QuestionsPage from './pages/QuestionsPage';
import EventsPage from './pages/EventsPage';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import AttendeeRegistrationPage from './pages/AttendeeRegistrationPage';
import RequestDemo from './pages/RequestDemo';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import OrganizerManagement from './pages/SuperAdmin/Organizers';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SuperAdminPlans from './pages/SuperAdmin/Plans';
import SuperAdminSettings from './pages/SuperAdmin/Settings';
import ParticipantLoginPage from './pages/ParticipantLoginPage';
import DocumentsPage from './pages/DocumentsPage';
import PrivacyPage   from './pages/PrivacyPage';
import TermsPage     from './pages/TermsPage';
import AboutPage     from './pages/AboutPage';
import ContactPage   from './pages/ContactPage';
import UpdatesPage   from './pages/UpdatesPage';
import BlogPage      from './pages/BlogPage';
import JobsPage      from './pages/JobsPage';
import InstallPrompt from './components/pwa/InstallPrompt';
import { useOfflineStatus } from './hooks/useOfflineStatus';

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

import { EventProvider } from './context/EventContext';

function App() {
  const { isOffline } = useOfflineStatus();
  
  return (
    <EventProvider>
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: '#BA7517', color: '#fff', padding: '10px',
          textAlign: 'center', fontFamily: 'Cairo, sans-serif', fontSize: '13px',
          fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', direction: 'rtl'
        }}>
          <span>📡</span>
          <span>أنت تعمل حالياً في وضع عدم الاتصال — يتم استعراض البيانات المحفوظة محلياً</span>
        </div>
      )}
      <InstallPrompt />
      <Routes>
      {/* ═══ المسارات العامة ═══ */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/request-demo" element={<RequestDemo />} />
      <Route path="/participant-login" element={<ParticipantLoginPage />} />
      
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

      <Route path="/dashboard/documents" element={
        <ProtectedRoute><DocumentsPage /></ProtectedRoute>
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
        <ProtectedRoute><DisplayControlPage /></ProtectedRoute>
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

      <Route path="/dashboard/designer/badge" element={
        <ProtectedRoute><BadgeDesigner /></ProtectedRoute>
      } />
      <Route path="/dashboard/designer/badge/:templateId" element={
        <ProtectedRoute><BadgeDesigner /></ProtectedRoute>
      } />

      <Route path="/dashboard/designer/certificate" element={
        <ProtectedRoute><CertificateDesigner /></ProtectedRoute>
      } />
      <Route path="/dashboard/designer/certificate/:templateId" element={
        <ProtectedRoute><CertificateDesigner /></ProtectedRoute>
      } />

      {/* ═══ المسارات العامة (بدون مصادقة) ═══ */}
      <Route path="/p/:eid/:token" element={<ParticipantPortal />} />
      <Route path="/kiosk/:eid" element={<SelfServicePage />} />
      <Route path="/kiosk" element={<SelfServicePage />} />
      <Route path="/display/:eid/:channel" element={<PublicDisplay />} />
      <Route path="/display/:eid" element={<PublicDisplay />} />
      <Route path="/register/:eid" element={<AttendeeRegistrationPage />} />
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

      {/* ═══ صفحات عامة / قانونية ═══ */}
      <Route path="/privacy"  element={<PrivacyPage />} />
      <Route path="/terms"    element={<TermsPage />} />
      <Route path="/about"    element={<AboutPage />} />
      <Route path="/contact"  element={<ContactPage />} />
      <Route path="/updates"  element={<UpdatesPage />} />
      <Route path="/blog"     element={<BlogPage />} />
      <Route path="/jobs"     element={<JobsPage />} />
      <Route path="/api-docs" element={<ApiDocsPage />} />

      {/* ═══ التوجيهات التلقائية ═══ */}
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </EventProvider>
  );
}

export default App;
