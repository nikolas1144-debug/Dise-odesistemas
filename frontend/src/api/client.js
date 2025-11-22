const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const isBrowser = typeof window !== 'undefined';
const isDevEnvironment = Boolean(env.DEV);
const configuredApiUrl = env.VITE_API_URL;
const renderApiUrl = env.VITE_RENDER_API_URL || 'https://dise-odesistemas1.onrender.com/api';

function resolveDefaultApiUrl() {
  if (configuredApiUrl) {
    return configuredApiUrl;
  }

  if (isDevEnvironment) {
    const devPort = env.VITE_DEV_BACKEND_PORT || '4000';
    const protocol = isBrowser && window.location?.protocol === 'https:' ? 'https:' : 'http:';

    if (isBrowser && window.location) {
      const { hostname } = window.location;
      const isLocalHostname =
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

      if (!isLocalHostname) {
        return `${protocol}//${hostname}:${devPort}/api`;
      }
    }

    return `${protocol}//localhost:${devPort}/api`;
  }

  if (!isDevEnvironment) {
    if (isBrowser && window.location?.origin) {
      return `${window.location.origin}/api`;
    }

    return renderApiUrl;
  }

  return 'http://localhost:4000/api';
}

const rawApiUrl = resolveDefaultApiUrl();
const API_URL = rawApiUrl.replace(/\/+$/, '');

async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function apiRequest(
  path,
  { method = 'GET', token, data, formData, responseType } = {}
) {
  const headers = new Headers();
  let body;

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (formData) {
    body = formData;
  } else if (data !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(data);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  let response;

  try {
    response = await fetch(`${API_URL}${normalizedPath}`, {
      method,
      headers,
      body,
    });
  } catch (networkError) {
    const error = new Error(
      'No se pudo establecer conexión con el servidor. Verifica que el backend esté disponible.'
    );
    error.cause = networkError;
    error.isNetworkError = true;
    throw error;
  }

  if (!response.ok) {
    const errorPayload = await parseResponse(response).catch(() => ({}));
    const message =
      (errorPayload && errorPayload.message) ||
      (typeof errorPayload === 'string' ? errorPayload : '') ||
      response.statusText ||
      'Error en la solicitud';
    const error = new Error(message);
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'text') {
    return response.text();
  }

  return parseResponse(response);
}

export function getApiUrl() {
  return API_URL;
}
