import { createContext, useContext } from 'react';
import type { Perfil } from '../types';

/** Sólo AccountRoute publica un perfil después de validarlo con el servidor. */
export const AccountProfileContext = createContext<Perfil | null>(null);

export interface AccountSessionStatus {
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/** Estado de la misma consulta remota que habilita el acceso a la cuenta. */
export const AccountSessionStatusContext = createContext<AccountSessionStatus | null>(null);
export const useAccountSessionStatus = () => useContext(AccountSessionStatusContext);

export const useAccountProfile = (): Perfil => {
  const profile = useContext(AccountProfileContext);
  if (!profile) throw new Error('Cuenta requiere una sesión validada.');
  return profile;
};
