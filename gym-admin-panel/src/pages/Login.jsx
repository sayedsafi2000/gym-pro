import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getErrorMessage } from '../services/errorHandler';
import useForm from '../hooks/useForm';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/Alert';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import FormField from '../components/ui/FormField';

const Login = () => {
  const { formData, handleChange: onFieldChange } = useForm({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (event) => {
    setError('');
    onFieldChange(event);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      login({ token: response.data.data.token, admin: response.data.data.admin });
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-card border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Sign in to access the gym management dashboard.
        </p>

        {error && (
          <div className="mt-6">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <FormField label="Email" required>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </FormField>

          <FormField label="Password" required>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </FormField>

          <Button type="submit" variant="primary" size="lg" loading={loading} fullWidth>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Contact your super admin to create an account.
        </div>
      </div>
    </div>
  );
};

export default Login;
