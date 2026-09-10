import { createContext, useContext } from 'react';
import type { Perfil } from '../types';

/** Sólo AccountRoute publica un perfil después de validarlo con el servidor. */
export const AccountProfileContext = createContext<Perfil | null>(null);

export const useAccountProfile = (): Perfil => {
  const profile = useContext(AccountProfileContext);
  if (!profile) throw new Error('Cuenta requiere una sesión validada.');
  return profile;
};
