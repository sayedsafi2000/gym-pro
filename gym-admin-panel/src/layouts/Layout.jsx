import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { removeToken, isSuperAdmin, hasPermission } from '../utils/auth';

const Layout = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choiceResult = await installPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(null);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Members', href: '/members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { name: 'Packages', href: '/packages', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: 'Store', href: '/store', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { name: 'Payments', href: '/payments', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Attendance', href: '/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { name: 'Devices', href: '/devices', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', permission: 'canManageDevices' },
    { name: 'Admins', href: '/admins', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', superOnly: true },
  ].filter(item => {
    if (item.superOnly) return isSuperAdmin();
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const NavIcon = ({ path }) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">GymPro Admin</h1>
              <p className="text-sm text-slate-500 mt-0.5 hidden sm:block">Gym management workspace</p>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-1.5 items-center">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2.5 rounded-[5px] text-sm font-medium transition duration-200 flex items-center gap-1.5 ${
                    location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <NavIcon path={item.icon} />
                  {item.name}
                </Link>
              ))}
              {installPrompt && !installed && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-3 py-2.5 rounded-[5px] bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition duration-200"
                >
                  Install
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  removeToken();
                  navigate('/login');
                }}
                className="px-3 py-2.5 rounded-[5px] border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition duration-200"
              >
                Logout
              </button>
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2.5 rounded-[5px] text-slate-600 hover:bg-slate-100 transition"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 flex flex-col">
            <div className="px-4 py-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">GymPro</h2>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium transition duration-200 ${
                    location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <NavIcon path={item.icon} />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-slate-200 space-y-2">
              {installPrompt && !installed && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="w-full px-3 py-2.5 rounded-[5px] bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
                >
                  Install App
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  removeToken();
                  navigate('/login');
                }}
                className="w-full px-3 py-2.5 rounded-[5px] border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
