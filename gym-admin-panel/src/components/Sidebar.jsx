import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isSuperAdmin, hasPermission } from '../utils/auth';
import { useTheme } from '../contexts/ThemeContext';

const NavIcon = ({ path }) => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Members', href: '/members', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { name: 'Packages', href: '/packages', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { name: 'Store', href: '/store', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { name: 'Payments', href: '/payments', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { name: 'Attendance', href: '/attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { name: 'Devices', href: '/devices', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', permission: 'canManageDevices' },
  { name: 'Admins', href: '/admins', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', superOnly: true },
];

const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const Sidebar = ({ collapsed, onToggle, onNavigate, mobile, onLogout, onInstall, canInstall }) => {
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();

  const items = NAV_ITEMS.filter((item) => {
    if (item.superOnly) return isSuperAdmin();
    if (item.permission) return hasPermission(item.permission);
    return true;
  });

  const isActive = (href) =>
    location.pathname === href || (href !== '/' && location.pathname.startsWith(href));

  const showLabels = !collapsed || mobile;
  const widthClass = mobile ? 'w-64' : collapsed ? 'w-16' : 'w-56';

  return (
    <aside
      className={`${widthClass} shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col transition-[width] duration-200 dark:bg-slate-900 dark:border-slate-800`}
    >
      {/* Brand */}
      <div className={`px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${showLabels ? 'justify-start' : 'justify-center'}`}>
        {showLabels ? (
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">GymPro</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Admin workspace</p>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-[5px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-sm font-semibold">G</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              title={collapsed && !mobile ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium transition ${
                active
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              } ${!showLabels ? 'justify-center' : ''}`}
            >
              <NavIcon path={item.icon} />
              {showLabels && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 space-y-1">
        {canInstall && (
          <button
            type="button"
            onClick={onInstall}
            title={collapsed && !mobile ? 'Install App' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition ${!showLabels ? 'justify-center' : ''}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {showLabels && <span>Install App</span>}
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title={collapsed && !mobile ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition ${!showLabels ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {showLabels && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed && !mobile ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[5px] text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition ${!showLabels ? 'justify-center' : ''}`}
        >
          <LogoutIcon />
          {showLabels && <span>Logout</span>}
        </button>
        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-[5px] text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition ${!showLabels ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
            {showLabels && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
