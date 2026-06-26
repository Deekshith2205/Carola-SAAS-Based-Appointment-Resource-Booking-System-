/**
 * Extracts a readable error message from an Axios error or unknown error.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (typeof error === 'object' && error !== null) {
    const e = error as {
      response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      message?: string;
    };
    if (e.response?.data?.message) return e.response.data.message;
    if (e.response?.data?.errors) {
      const msgs = Object.values(e.response.data.errors).flat();
      if (msgs.length) return msgs[0];
    }
    if (e.message) return e.message;
  }
  return fallback;
}
