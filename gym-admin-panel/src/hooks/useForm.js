import { useCallback, useState } from 'react';

// Shared controlled-form helper. `handleChange` handles text inputs + checkbox
// + number inputs out of the box. For custom fields (selects, toggles), call
// `setField(name, value)` directly. `reset()` jumps back to the initial state
// (or an override if you pass one).
//
// Error helpers are additive: existing call sites that only destructure
// { formData, handleChange, setField, reset } keep working unchanged.

const readEventValue = (e) => {
  const { type, value, checked } = e.target;
  if (type === 'checkbox') return checked;
  if (type === 'number') return value === '' ? '' : Number(value);
  return value;
};

export default function useForm(initial) {
  const [formData, setFormData] = useState(initial);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((e) => {
    const { name } = e.target;
    setFormData((prev) => ({ ...prev, [name]: readEventValue(e) }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const setField = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const reset = useCallback((next) => {
    setFormData(next ?? initial);
    setErrors({});
  }, [initial]);

  const setError = useCallback((name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const clearError = useCallback((name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // rules: { fieldName: (value, formData) => string | null }
  const validate = useCallback(
    (rules) => {
      const next = {};
      for (const key of Object.keys(rules)) {
        const msg = rules[key](formData[key], formData);
        if (msg) next[key] = msg;
      }
      setErrors(next);
      return Object.keys(next).length === 0;
    },
    [formData],
  );

  const hasErrors = Object.keys(errors).length > 0;

  return {
    formData,
    setFormData,
    handleChange,
    setField,
    reset,
    errors,
    setErrors,
    setError,
    clearError,
    validate,
    hasErrors,
  };
}
