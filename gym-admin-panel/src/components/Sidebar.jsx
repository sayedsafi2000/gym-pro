import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  CreditCard,
  CalendarCheck,
  Fingerprint,
  ShieldCheck,
  Download,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SunIcon,
  MoonIcon,
  LogoutIcon,
} from './Icons';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/', Icon: LayoutDashboard },
  { name: 'Members', href: '/members', Icon: Users },
  { name: 'Packages', href: '/packages', Icon: Package },
  { name: 'Store', href: '/store', Icon: ShoppingBag },
  { name: 'Payments', href: '/payments', Icon: CreditCard },
  { name: 'Attendance', href: '/attendance', Icon: CalendarCheck },
  { name: 'Devices', href: '/devices', Icon: Fingerprint, permission: 'canManageDevices' },
  { name: 'Admins', href: '/admins', Icon: ShieldCheck, superOnly: true },
];

const ICON_CLS = 'w-5 h-5 shrink-0';

const Sidebar = ({ collapsed, onToggle, onNavigate, mobile, onLogout, onInstall, canInstall, onClose }) => {
  const location = useLocation();
  const { theme, toggle: toggleTheme } = useTheme();
  const { isSuperAdmin: isSuper, hasPermission } = useAuth();

  const items = NAV_ITEMS.filter((item) => {
    if (item.superOnly) return isSuper;
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
      <div className={`px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${showLabels ? 'justify-between' : 'justify-center'}`}>
        {showLabels ? (
          <>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">GymPro</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Admin workspace</p>
            </div>
            {mobile && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="shrink-0 rounded-control p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="w-8 h-8 rounded-control bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">G</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(item.href);
          const { Icon } = item;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              title={collapsed && !mobile ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition ${
                active
                  ? 'bg-brand-600 text-white dark:bg-brand-500'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              } ${!showLabels ? 'justify-center' : ''}`}
            >
              <Icon className={ICON_CLS} />
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 transition ${!showLabels ? 'justify-center' : ''}`}
          >
            <Download className={ICON_CLS} />
            {showLabels && <span>Install App</span>}
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title={collapsed && !mobile ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition ${!showLabels ? 'justify-center' : ''}`}
        >
          {theme === 'dark' ? <SunIcon className={ICON_CLS} /> : <MoonIcon className={ICON_CLS} />}
          {showLabels && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed && !mobile ? 'Logout' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition ${!showLabels ? 'justify-center' : ''}`}
        >
          <LogoutIcon className={ICON_CLS} />
          {showLabels && <span>Logout</span>}
        </button>
        {!mobile && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-control text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition ${!showLabels ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
            {showLabels && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
