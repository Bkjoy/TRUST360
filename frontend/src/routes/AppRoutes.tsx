import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { InstitutionDashboard } from '../pages/dashboards/InstitutionDashboard';
import { OfficerDashboard } from '../pages/dashboards/OfficerDashboard';
import { AdminDashboard } from '../pages/dashboards/AdminDashboard';
import { FDRListPage } from '../pages/fdrs/FDRListPage';
import { FDRDetailsPage } from '../pages/fdrs/FDRDetailsPage';
import { CreateFDRPage } from '../pages/fdrs/CreateFDRPage';
import { VerificationQueuePage } from '../pages/verification/VerificationQueuePage';
import { DiscrepancyResolutionPage } from '../pages/verification/DiscrepancyResolutionPage';
import { RenewalListPage } from '../pages/renewals/RenewalListPage';
import { CreateRenewalPage } from '../pages/renewals/CreateRenewalPage';
import { ReleaseListPage } from '../pages/releases/ReleaseListPage';
import { CreateReleasePage } from '../pages/releases/CreateReleasePage';
import { InstitutionListPage } from '../pages/institutions/InstitutionListPage';
import { InstitutionDetailsPage } from '../pages/institutions/InstitutionDetailsPage';
import { AnalyticsReportsPage } from '../pages/reports/AnalyticsReportsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { AuditLogsPage } from '../pages/admin/AuditLogsPage';
import { AIAssistantPage } from '../pages/assistant/AIAssistantPage';
import { useAuth } from '../context/AuthContext';

const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'INSTITUTION_ADMIN') {
    return <InstitutionDashboard />;
  }
  if (user?.role === 'SCRUTINY_OFFICER') {
    return <OfficerDashboard />;
  }
  return <AdminDashboard />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<RoleBasedDashboard />} />
          
          {/* FDR Management */}
          <Route path="/fdrs" element={<FDRListPage />} />
          <Route path="/fdrs/new" element={<CreateFDRPage />} />
          <Route path="/fdrs/:id" element={<FDRDetailsPage />} />

          {/* Verification & Discrepancies */}
          <Route path="/verification" element={<VerificationQueuePage />} />
          <Route path="/discrepancies" element={<DiscrepancyResolutionPage />} />

          {/* Workflows */}
          <Route path="/renewals" element={<RenewalListPage />} />
          <Route path="/renewals/new" element={<CreateRenewalPage />} />
          <Route path="/releases" element={<ReleaseListPage />} />
          <Route path="/releases/new" element={<CreateReleasePage />} />

          {/* Directory & Analytics */}
          <Route path="/institutions" element={<InstitutionListPage />} />
          <Route path="/institutions/:id" element={<InstitutionDetailsPage />} />
          <Route path="/reports" element={<AnalyticsReportsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* AI Assistant & Query Helpdesk */}
          <Route path="/assistant" element={<AIAssistantPage />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />

          {/* Admin & Security */}
          <Route path="/audit" element={<AuditLogsPage />} />

          {/* Catch-all redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};
