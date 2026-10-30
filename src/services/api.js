export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function createTodoApi({ baseUrl = '/api', fetchImpl = (...args) => fetch(...args), timeoutMs = 15000 } = {}) {
  const base = baseUrl.replace(/\/$/, '');

  async function request(path, { method = 'GET', body, token, signal } = {}) {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort(signal.reason);
    if (signal?.aborted) forwardAbort();
    else signal?.addEventListener('abort', forwardAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(base + path, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const text = await response.text();
      let data = text;
      try { data = text ? JSON.parse(text) : null; } catch { /* Some backend responses are plain text. */ }
      if (!response.ok) {
        const message = typeof data === 'string' && !data.includes('<') && data.length < 250
          ? data
          : typeof data?.message === 'string' ? data.message : `The request failed (${response.status}). Please try again.`;
        throw new ApiError(message || `The request failed (${response.status}).`, response.status);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError || signal?.aborted) throw error;
      if (controller.signal.aborted) throw new ApiError('The server took too long to respond. Check that your backend is running.');
      throw new ApiError('Cannot reach the backend. Start Spring Boot and check the connection settings in .env.');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }

  const payload = (task, includeId = false) => ({
    ...(includeId ? { id: task.id } : {}),
    title: task.title.trim(),
    description: (task.description || '').trim(),
    isCompleted: Boolean(task.isCompleted),
  });

  return {
    async login(email, password) {
      const data = await request('/auth/Login', { method: 'POST', body: { email: email.trim(), password } });
      if (!data || typeof data.token !== 'string' || !data.token.trim()) throw new ApiError('The login response did not contain a token.');
      return data.token;
    },
  register: (fullName, email, password) =>
  request('/auth/Register', {
    method: 'POST',
    body: {
      fullName: fullName.trim(),
      email: email.trim(),
      password
    }
  }),
    async list(token, signal) {
      const data = await request('/todo', { token, signal });
      if (!Array.isArray(data)) throw new ApiError('Expected a task list from GET /todo. Check the API route.');
      return data.map((task) => ({ ...task, title: task.title || '', description: task.description || '', isCompleted: task.isCompleted === true }));
    },
    create: (task, token) => request('/todo/create', { method: 'POST', token, body: payload(task) }),
    update: (task, token) => request('/todo', { method: 'PUT', token, body: payload(task, true) }),
    remove: (id, token) => request(`/todo/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  };
}

export const api = createTodoApi({ baseUrl: import.meta.env?.VITE_API_BASE_URL || '/api' });
