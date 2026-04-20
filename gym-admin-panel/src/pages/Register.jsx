import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { getToken, setToken } from '../utils/auth';

const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (event) => {
    setError('');
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
      });
      setToken(response.data.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[5px] p-8 shadow-sm dark:bg-slate-900 dark:border-slate-700">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2 dark:text-slate-100">Create Admin Account</h1>
        <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">Set up your gym management dashboard access.</p>

        {error && <div className="mb-4 rounded-[5px] border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 pr-10 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Min 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-[5px] border border-slate-300 bg-slate-50 px-4 py-3 pr-10 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition duration-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[5px] bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 transition duration-200 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-600 dark:text-slate-400">Already have an account? </span>
          <Link to="/login" className="text-slate-900 font-medium hover:underline dark:text-slate-100">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
