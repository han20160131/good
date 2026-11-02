/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '../types';
import { safeFetchJson } from './apiClient';

const TOKEN_KEY = 'tts_auth_token';
const USER_KEY = 'tts_auth_user';
const KNOWN_ACCOUNTS_KEY = 'tts_known_accounts';

// Cookie helper
function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days: number = 365) {
  try {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {}
}

function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

/**
 * Retrieve token from localStorage, sessionStorage, or persistent cookie
 */
export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
    if (token && (token.includes('yangzhengrui') || token.includes('ray'))) {
      clearStoredAuth();
      return null;
    }
    return token || null;
  } catch {
    return null;
  }
}

/**
 * Save token across all browser storage mechanisms
 */
export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_KEY, token);
    setCookie(TOKEN_KEY, token, 365);
  } catch (e) {
    console.error('Failed to save token to storage:', e);
  }
}

/**
 * Retrieve user from localStorage, sessionStorage, or cookie
 */
export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || getCookie(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (
      user &&
      (user.username === 'ray' ||
        user.displayName === 'ray' ||
        user.displayName === '楊正叡' ||
        user.username === 'yangzhengrui' ||
        user.id === 'user_ray' ||
        user.id === '6D8S1wHhk8RxSTS8fZR65gOTXPp2')
    ) {
      clearStoredAuth();
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

/**
 * Save user across all storage mechanisms & record in known accounts
 */
export function setStoredUser(user: User): void {
  try {
    const userJson = JSON.stringify(user);
    localStorage.setItem(USER_KEY, userJson);
    sessionStorage.setItem(USER_KEY, userJson);
    setCookie(USER_KEY, userJson, 365);
    try {
      localStorage.removeItem(KNOWN_ACCOUNTS_KEY);
    } catch {}
  } catch (e) {
    console.error('Failed to save user to storage:', e);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    deleteCookie(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    deleteCookie(USER_KEY);
    localStorage.removeItem(KNOWN_ACCOUNTS_KEY);
  } catch (e) {
    console.error('Failed to clear auth from storage:', e);
  }
}

// Immediate boot auto-purge of stale 'ray' test sessions
try {
  const bootUser = localStorage.getItem(USER_KEY) || getCookie(USER_KEY);
  if (bootUser && (bootUser.includes('"ray"') || bootUser.includes('楊正叡') || bootUser.includes('yangzhengrui'))) {
    clearStoredAuth();
  }
} catch {}

/**
 * Historical accounts list is decommissioned
 */
export function getKnownAccounts(): User[] {
  return [];
}

export function addKnownAccount(_user: User): void {
  try {
    localStorage.removeItem(KNOWN_ACCOUNTS_KEY);
  } catch {}
}

/**
 * Restore user session from client storage to server
 * If server was restarted or files wiped, this immediately rehydrates the account on server!
 */
export async function restoreUserSession(user: User): Promise<{ user: User; token: string } | null> {
  try {
    const { ok, data } = await safeFetchJson('/api/auth/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });

    if (ok && data?.token && data?.user) {
      setStoredToken(data.token);
      setStoredUser(data.user);
      return data as { user: User; token: string };
    }
  } catch (e) {
    console.warn('[authClient] Restore session request failed:', e);
  }
  return null;
}

/**
 * Restore user session only if this specific device previously logged in (DMG / local device persistence)
 */
export async function ensureAutoLogin(): Promise<{ user: User; token: string } | null> {
  try {
    const token = getStoredToken();
    if (!token) {
      // First time on this device or explicitly logged out: do not auto-login
      return null;
    }

    // Verify token with server
    const { ok, data } = await safeFetchJson('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (ok && data?.user) {
      setStoredUser(data.user);
      return { user: data.user, token };
    }

    // If token is invalid or expired, clear storage and remain logged out
    clearStoredAuth();
  } catch (e) {
    console.warn('[authClient] Device session check failed:', e);
  }
  return null;
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const user = getStoredUser();
  const headers = new Headers(init?.headers || {});
  if (token) {
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('x-auth-token')) {
      headers.set('x-auth-token', token);
    }
  }
  if (user?.id && !headers.has('x-user-id')) {
    headers.set('x-user-id', user.id);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  return response;
}
