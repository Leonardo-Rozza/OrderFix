import type { TokenClaims } from '../types';

/**
 * Decodifica el payload de un JWT sin validar la firma.
 * Solo para mostrar datos (email/rol) en la UI; la seguridad la valida el backend.
 */
export const decodeToken = (token: string | null | undefined): TokenClaims | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as TokenClaims;
  } catch {
    return null;
  }
};

/** True si el token expiró (campo exp en segundos). */
export const isTokenExpired = (token: string | null | undefined): boolean => {
  const claims = decodeToken(token);
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now();
};
