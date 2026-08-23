import { describe, expect, it } from 'vitest';
import { LEGAL_PLACEHOLDERS, validateLegalContactConfig } from './legalContact';

describe('configuración legal pública', () => {
  it('mantiene una lista cerrada y visible de placeholders editoriales', () => {
    expect(LEGAL_PLACEHOLDERS).toEqual([
      '[RAZÓN SOCIAL]',
      '[CUIT]',
      '[DOMICILIO]',
      '[EMAIL LEGAL]',
      '[EMAIL PRIVACIDAD]',
      '[JURISDICCIÓN]',
      '[HORARIO DE ATENCIÓN]',
    ]);
  });

  it('no bloquea contactos todavía editables durante desarrollo', () => {
    expect(validateLegalContactConfig({}, false)).toEqual([]);
  });

  it('rechaza contactos vacíos al forzar un release público', () => {
    expect(validateLegalContactConfig({}, true)).toEqual([
      { code: 'CONTACT_MISSING', variable: 'VITE_LEGAL_EMAIL' },
      { code: 'CONTACT_MISSING', variable: 'VITE_PRIVACY_EMAIL' },
      { code: 'CONTACT_MISSING', variable: 'VITE_SUPPORT_EMAIL' },
    ]);
  });

  it('rechaza emails de ejemplo o inválidos sin devolver su contenido', () => {
    expect(
      validateLegalContactConfig(
        {
          VITE_LEGAL_EMAIL: 'legal@example.com',
          VITE_PRIVACY_EMAIL: 'sin-arroba',
          VITE_SUPPORT_EMAIL: 'soporte@ordenfix.com',
        },
        true
      )
    ).toEqual([
      { code: 'CONTACT_INVALID', variable: 'VITE_LEGAL_EMAIL' },
      { code: 'CONTACT_INVALID', variable: 'VITE_PRIVACY_EMAIL' },
    ]);
  });

  it.each([
    'legal@127.0.0.1',
    'legal@equipo.local',
    'legal@api.internal',
    'legal@api.localdomain',
  ])(
    'rechaza el contacto no público %s',
    (email) => {
      expect(
        validateLegalContactConfig(
          {
            VITE_LEGAL_EMAIL: email,
            VITE_PRIVACY_EMAIL: 'privacidad@ordenfix.com',
            VITE_SUPPORT_EMAIL: 'soporte@ordenfix.com',
          },
          true
        )
      ).toEqual([{ code: 'CONTACT_INVALID', variable: 'VITE_LEGAL_EMAIL' }]);
    }
  );

  it.each(['.legal@ordenfix.com', 'legal..ops@ordenfix.com'])(
    'rechaza el local-part no canónico %s',
    (email) => {
      expect(
        validateLegalContactConfig(
          {
            VITE_LEGAL_EMAIL: email,
            VITE_PRIVACY_EMAIL: 'privacidad@ordenfix.com',
            VITE_SUPPORT_EMAIL: 'soporte@ordenfix.com',
          },
          true
        )
      ).toEqual([{ code: 'CONTACT_INVALID', variable: 'VITE_LEGAL_EMAIL' }]);
    }
  );
});
