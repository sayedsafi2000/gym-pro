import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

const STORAGE_KEY = 'gym_pro_sidebar_collapsed';

const PAGE_TITLES = [
  { match: /^\/members\/[^/]+\/edit/, title: 'Edit Member' },
  { match: /^\/members\/add/, title: 'Add Member' },
  { match: /^\/members\/[^/]+/, title: 'Member Details' },
  { match: /^\/members/, title: 'Members' },
  { match: /^\/packages/, title: 'Packages' },
  { match: /^\/store/, title: 'Store' },
  { match: /^\/payments/, title: 'Payments' },
  { match: /^\/attendance/, title: 'Attendance' },
  { match: /^\/devices/, title: 'Devices' },
  { match: /^\/admins/, title: 'Admins' },
  { match: /^\/$/, title: 'Dashboard' },
];

const resolveTitle = (pathname) => {
  const hit = PAGE_TITLES.find((p) => p.match.test(pathname));
  return hit ? hit.title : 'GymPro';
};

const Layout = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const appInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', appInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalled);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canInstall = Boolean(installPrompt) && !installed;
  const pageTitle = resolveTitle(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onLogout={handleLogout}
          onInstall={handleInstall}
          canInstall={canInstall}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50">
            <Sidebar
              collapsed={false}
              mobile
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
              onInstall={handleInstall}
              canInstall={canInstall}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <button
              type="button"
              className="md:hidden p-2 rounded-control text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{pageTitle}</h1>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
