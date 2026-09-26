import { describe, expect, it } from 'vitest';
import { AYUDA_ACCESO_EQUIPO, TIPOS_EQUIPO, tipoEquipoLabel } from './equipos';

describe('equipment catalog', () => {
  it.each([['TABLET', 'Tablet'], ['JOYSTICK', 'Joystick']] as const)(
    'includes %s with its readable label', (tipo, label) => {
      expect(TIPOS_EQUIPO).toContain(tipo);
      expect(tipoEquipoLabel(tipo)).toBe(label);
    },
  );

  it('preserves all existing categories and the unclassified fallback', () => {
    expect(TIPOS_EQUIPO).toEqual(expect.arrayContaining([
      'CELULAR', 'NOTEBOOK', 'CONSOLA', 'PC_ESCRITORIO', 'MONITOR', 'TV', 'OTRO',
    ]));
    expect(tipoEquipoLabel(undefined)).toBe('Otro / sin clasificar');
    expect(tipoEquipoLabel('OTRO')).toBe('Otro / sin clasificar');
  });

  it('keeps access optional with category-specific guidance', () => {
    expect(AYUDA_ACCESO_EQUIPO.TABLET).toMatch(/patrón o PIN/);
    expect(AYUDA_ACCESO_EQUIPO.JOYSTICK).toMatch(/Habitualmente no necesita datos de acceso/);
  });
});
