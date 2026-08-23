import { usePerfilQuery } from '../api/queries/perfil.queries';
import { useAuth } from '../store/auth.store';
import { isTokenExpired } from '../utils/jwt';
import type { Rol } from '../types';

const clean = (value: string | null | undefined) => value?.trim() || null;

const emailPrefix = (value: string | null) => {
  if (!value) return null;
  return clean(value.split('@')[0]);
};

const initialsFrom = (value: string | null) => {
  if (!value) return '—';
  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase() || '—';
};

const visibleRole = (role: Rol | null) => {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'USER') return 'Empleado';
  return 'Usuario';
};

/**
 * Identidad exclusivamente visual. Los permisos continúan saliendo de useAuth
 * y nunca de la respuesta remota del perfil.
 */
export const useSessionIdentity = () => {
  const { token, email: sessionEmail, role: jwtRole, isAuthenticated } = useAuth();
  const query = usePerfilQuery();
  const profileName = clean(query.data?.usuario.username);
  const email = clean(query.data?.usuario.email) ?? clean(sessionEmail);
  const role = query.data?.usuario.role ?? jwtRole;
  const workshopName = clean(query.data?.taller.nombre);
  const validSession = isAuthenticated && !!token && !isTokenExpired(token);
  const accountName = profileName ?? email ?? 'Mi cuenta';
  const greetingName = profileName ?? emailPrefix(email) ?? 'bienvenido';

  return {
    perfil: query.data,
    nombre: accountName,
    nombreSaludo: greetingName,
    taller: workshopName ?? 'Mi taller',
    email: email ?? '',
    rol: role,
    rolVisible: visibleRole(role),
    iniciales: initialsFrom(profileName ?? emailPrefix(email)),
    isLoading: validSession && query.isPending,
    isFallback: !query.data,
    isError: query.isError,
    refetch: query.refetch,
  };
};
