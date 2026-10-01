import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../api/config';

const AuthContext = createContext(null);

export function mapTechnicalToFriendlyError(code, rawMsg = '') {
  const msgLower = (rawMsg || '').toLowerCase();

  // Check network failures & browser fetch errors first (e.g., Safari 'Load failed', Chrome 'Failed to fetch')
  if (
    code === 'NETWORK_ERROR' ||
    msgLower.includes('load failed') ||
    msgLower.includes('failed to fetch') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('network error') ||
    msgLower.includes('econnrefused') ||
    msgLower.includes('typeerror') ||
    msgLower.includes('failed to execute')
  ) {
    return 'Unable to connect to the backend server. Please check your connection and try again.';
  }

  // If rawMsg is already a clean, human-readable user message from FastAPI (e.g., "An account with this email already exists.")
  if (
    rawMsg &&
    !msgLower.includes('json') &&
    !msgLower.includes('fetch') &&
    !msgLower.includes('http') &&
    !msgLower.includes('syntax') &&
    !msgLower.includes('exception') &&
    !msgLower.includes('response') &&
    !msgLower.includes('500') &&
    !msgLower.includes('502') &&
    !msgLower.includes('504') &&
    !msgLower.includes('unexpected') &&
    !msgLower.includes('internal_error')
  ) {
    return rawMsg;
  }

  if (
    code === 'INVALID_CREDENTIALS' ||
    code === 'USER_NOT_FOUND' ||
    msgLower.includes('incorrect') ||
    msgLower.includes('invalid email or password') ||
    msgLower.includes('password mismatch')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (code === 'VALIDATION_ERROR' || msgLower.includes('valid email') || msgLower.includes('email and password are required')) {
    if (msgLower.includes('already exists')) {
      return 'An account with this email already exists. Please log in.';
    }
    return 'Please enter a valid email address.';
  }

  if (code === 'SERVER_ERROR' || msgLower.includes('500') || msgLower.includes('502') || msgLower.includes('504') || msgLower.includes('internal')) {
    return 'Server error. Please try again in a moment.';
  }

  if (msgLower.includes('json') || msgLower.includes('unexpected end') || msgLower.includes('syntaxerror')) {
    return 'Unable to reach the backend service. Please ensure the server is running and try again.';
  }

  return 'Unable to process your request right now. Please try again.';
}

async function safeFetchAuth(url, options) {
  let response;
  try {
    const fullUrl = getApiUrl(url);
    response = await fetch(fullUrl, options);
  } catch (netErr) {
    console.error('[AUTH_DEV_LOG] Network request failed:', netErr);
    throw {
      code: 'NETWORK_ERROR',
      message: mapTechnicalToFriendlyError('NETWORK_ERROR', netErr.message)
    };
  }

  const contentType = response.headers.get('content-type') || '';
  let responseText = '';
  try {
    responseText = await response.text();
  } catch (readErr) {
    console.error('[AUTH_DEV_LOG] Failed to read response body:', readErr);
    responseText = '';
  }

  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[AUTH_DEV_LOG] Response JSON parsing failed:', parseErr, 'Raw Text:', responseText.slice(0, 150));
    }
  }

  if (response.ok) {
    if (data) return data;
    return { success: true };
  }

  // Developer logging for errors
  console.error(`[AUTH_DEV_LOG] HTTP ${response.status} Error:`, data || responseText);

  const rawMsg = (data && (data.message || data.detail)) ? (data.message || data.detail) : responseText;
  const errCode = (data && data.code) ? data.code : (response.status === 401 ? 'INVALID_CREDENTIALS' : 'SERVER_ERROR');

  const friendlyMessage = mapTechnicalToFriendlyError(errCode, rawMsg);
  throw {
    code: errCode,
    message: friendlyMessage
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('docintel_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate existing token on app load
  useEffect(() => {
    if (token) {
      safeFetchAuth('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((data) => {
          setUser(data.user);
          setLoading(false);
        })
        .catch((err) => {
          console.warn('[AUTH_DEV_LOG] Invalid token session, clearing localStorage:', err);
          localStorage.removeItem('docintel_token');
          setToken(null);
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const data = await safeFetchAuth('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem('docintel_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (email, password, name) => {
    const data = await safeFetchAuth('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    localStorage.setItem('docintel_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    if (token) {
      try {
        await safeFetchAuth('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn('[AUTH_DEV_LOG] Logout API warning:', err);
      }
    }
    localStorage.removeItem('docintel_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        signup,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

