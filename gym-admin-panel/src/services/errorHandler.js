// One source of truth for axios error → user-facing message. Handles the
// usual shapes: API JSON envelope, network failures, raw Error objects.

export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;

  const apiMessage = error.response?.data?.message;
  if (apiMessage) return apiMessage;

  const firstIssue = error.response?.data?.errors?.[0];
  if (firstIssue?.message) {
    return firstIssue.path ? `${firstIssue.path}: ${firstIssue.message}` : firstIssue.message;
  }

  if (error.code === 'ERR_NETWORK') return 'Network error — check your connection and try again.';
  if (error.message) return error.message;

  return fallback;
};
