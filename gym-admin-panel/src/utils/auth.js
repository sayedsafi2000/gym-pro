export const TOKEN_KEY = 'gym_pro_admin_token';
export const ADMIN_KEY = 'gym_pro_admin_data';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
};
export const isLoggedIn = () => Boolean(getToken());

export const setAdminData = (admin) => localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
export const getAdminData = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY)) || {};
  } catch {
    return {};
  }
};
export const getRole = () => getAdminData().role || 'admin';
export const isSuperAdmin = () => getRole() === 'super_admin';
export const getPermissions = () => getAdminData().permissions || {};
export const hasPermission = (perm) => isSuperAdmin() || (getPermissions()[perm] === true);
