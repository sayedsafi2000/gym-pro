import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';

// Eager: Login (entry) and Layout shell. Everything else code-splits —
// first paint only downloads the chunks the user actually visits.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MembersList = lazy(() => import('./pages/MembersList'));
const AddMember = lazy(() => import('./pages/AddMember'));
const EditMember = lazy(() => import('./pages/EditMember'));
const MemberDetails = lazy(() => import('./pages/MemberDetails'));
const Packages = lazy(() => import('./pages/Packages'));
const Payments = lazy(() => import('./pages/Payments'));
const Store = lazy(() => import('./pages/Store'));
const Attendance = lazy(() => import('./pages/Attendance'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const ManageAdmins = lazy(() => import('./pages/ManageAdmins'));
const SystemUpdate = lazy(() => import('./pages/SystemUpdate'));

const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center text-slate-400 dark:text-slate-500">
    Loading…
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="members" element={<MembersList />} />
              <Route path="members/add" element={<AddMember />} />
              <Route path="members/:id" element={<MemberDetails />} />
              <Route path="members/:id/edit" element={<EditMember />} />
              <Route path="packages" element={<Packages />} />
              <Route path="store" element={<Store />} />
              <Route path="payments" element={<Payments />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="devices" element={<DeviceManagement />} />
              <Route path="admins" element={<ManageAdmins />} />
              <Route path="system" element={<SystemUpdate />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
