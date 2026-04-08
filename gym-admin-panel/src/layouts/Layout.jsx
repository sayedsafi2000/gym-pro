import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';

const Layout = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
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
    { name: 'Dashboard', href: '/' },
    { name: 'Members', href: '/members' },
    { name: 'Packages', href: '/packages' },
    { name: 'Store', href: '/store' },
    { name: 'Payments', href: '/payments' },
    { name: 'Attendance', href: '/attendance' },
    { name: 'Devices', href: '/devices' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">GymPro Admin</h1>
              <p className="text-sm text-slate-500 mt-1">A clean, focused admin workspace.</p>
            </div>
            <nav className="flex flex-wrap gap-2 items-center">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-4 py-2 rounded-[5px] text-sm font-medium transition duration-200 ${
                    location.pathname === item.href
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {installPrompt && !installed && (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="px-4 py-2 rounded-[5px] bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition duration-200"
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
                className="px-4 py-2 rounded-[5px] border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition duration-200"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;