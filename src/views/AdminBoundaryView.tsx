/**
 * AppexQuant Markets Global - Administrative Boundary View
 * Delegates to protected AdminPortal component set with server-verified sub-routes for Integrations and System Health.
 */

import React from 'react';
import { AdminPortal } from '../components/admin/AdminPortal';

export const AdminBoundaryView: React.FC = () => {
  return <AdminPortal />;
};
