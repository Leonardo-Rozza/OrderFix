import type { BrowserContext, Page } from '@playwright/test';

// --- JWT de mentira con exp futura (para pasar el guard de sesión) ---
const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export const futureToken = () =>
  `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'admin@mvgr.com', exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

/** Inyecta sesión en localStorage (formato de zustand persist) antes de cargar la app. */
export const seedAuth = async (context: BrowserContext, token = futureToken()) => {
  const value = JSON.stringify({
    state: { token, email: 'admin@mvgr.com', isAuthenticated: true },
    version: 0,
  });
  await context.addInitScript((v) => {
    window.localStorage.setItem('ordenfix-auth', v as string);
  }, value);
};

const pageOf = <T>(items: T[]) => ({
  content: items,
  page: { size: 1000, number: 0, totalElements: items.length, totalPages: 1 },
});

export interface MockData {
  reparaciones?: unknown[];
  equipos?: unknown[];
  clientes?: unknown[];
  repuestos?: unknown[];
}

/** Mockea toda la API (/api/**) a nivel de red, así los E2E no dependen del backend. */
export const mockApi = async (page: Page, data: MockData = {}) => {
  const { reparaciones = [], equipos = [], clientes = [], repuestos = [] } = data;

  // Solo interceptamos el backend (localhost:8080), NO los módulos que Vite
  // sirve en dev desde /src/api/... (un glob **/api/** los pisaría).
  await page.route((url) => url.origin === 'http://localhost:8080', async (route) => {
    const req = route.request();
    const { pathname } = new URL(req.url());
    const method = req.method();

    // Auth
    if (pathname.endsWith('/api/auth/login') && method === 'POST') {
      return route.fulfill({ json: { token: futureToken(), type: 'Bearer', email: 'admin@mvgr.com' } });
    }

    // Ingreso rápido
    if (pathname.endsWith('/api/reparaciones/ingreso-rapido') && method === 'POST') {
      return route.fulfill({
        status: 201,
        json: { clienteId: 1, equipoId: 1, clienteNuevo: true, reparacion: { id: 999 } },
      });
    }

    // Cambiar estado: PATCH /api/reparaciones/:id/estado (body = "ESTADO")
    if (/\/api\/reparaciones\/\d+\/estado$/.test(pathname) && method === 'PATCH') {
      const id = Number(pathname.match(/reparaciones\/(\d+)\/estado/)![1]);
      const estado = (req.postDataJSON() as { estado?: string })?.estado;
      return route.fulfill({ json: { id, estado } });
    }

    // Listados (GET)
    if (pathname.endsWith('/api/reparaciones') && method === 'GET') return route.fulfill({ json: pageOf(reparaciones) });
    if (pathname.endsWith('/api/equipos') && method === 'GET') return route.fulfill({ json: pageOf(equipos) });
    if (pathname.endsWith('/api/clientes') && method === 'GET') return route.fulfill({ json: pageOf(clientes) });
    if (pathname.endsWith('/api/repuestos') && method === 'GET') return route.fulfill({ json: pageOf(repuestos) });
    if (pathname.includes('/api/repuestos/reparacion/')) return route.fulfill({ json: pageOf([]) });

    // Seguimiento público
    if (pathname.includes('/api/seguimiento/')) {
      return route.fulfill({
        json: {
          codigo: 'ABC123',
          estado: 'EN_PROCESO',
          marca: 'Apple',
          modelo: 'iPhone 13',
          taller: 'MVGR Reparaciones',
          fechaIngreso: '2026-06-10',
          fechaEstimadaEntrega: '2026-06-20',
          presupuesto: 50000,
        },
      });
    }

    // Dashboard
    if (pathname.endsWith('/api/dashboard')) {
      return route.fulfill({
        json: {
          reparacionesPorEstado: { INGRESADO: 0, EN_PROCESO: 0, ESPERANDO_REPUESTO: 0, COMPLETADO: 0, ENTREGADO: 0 },
          totalReparaciones: 0,
          reparacionesEsteMes: 0,
          equiposListos: 0,
          plan: 'FREE',
          estadoSuscripcion: 'TRIAL',
          limiteReparacionesMes: 50,
        },
      });
    }

    // Suscripción
    if (pathname.endsWith('/api/suscripcion')) {
      return route.fulfill({
        json: {
          plan: 'FREE',
          estado: 'TRIAL',
          fechaInicio: null,
          fechaFinTrial: null,
          proximoCobro: null,
          reparacionesEsteMes: 0,
          limiteReparacionesMes: 50,
        },
      });
    }

    // Default: lista vacía / OK
    return route.fulfill({ json: pageOf([]) });
  });
};
