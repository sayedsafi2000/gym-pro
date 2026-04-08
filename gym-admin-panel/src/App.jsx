import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import MembersList from './pages/MembersList';
import AddMember from './pages/AddMember';
import EditMember from './pages/EditMember';
import Packages from './pages/Packages';
import Payments from './pages/Payments';
import Store from './pages/Store';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<MembersList />} />
            <Route path="members/add" element={<AddMember />} />
            <Route path="members/:id/edit" element={<EditMember />} />
            <Route path="packages" element={<Packages />} />              <Route path="store" element={<Store />} />            <Route path="payments" element={<Payments />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
