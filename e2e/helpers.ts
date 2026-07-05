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

const defaultSuscripcion = {
  plan: 'FREE',
  estado: 'TRIAL',
  fechaInicio: null,
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 0,
  limiteReparacionesMes: 50,
};

const defaultSeguimiento = {
  codigo: 'ABC123',
  estado: 'EN_PROCESO',
  marca: 'Apple',
  modelo: 'iPhone 13',
  taller: 'MVGR Reparaciones',
  fechaIngreso: '2026-06-10',
  fechaEstimadaEntrega: '2026-06-20',
  presupuesto: {
    id: 1,
    reparacionId: 1,
    estado: 'PENDIENTE',
    items: [{ descripcion: 'Pantalla', cantidad: 1, precioUnitario: 50000 }],
    total: 50000,
    observaciones: null,
    fechaRespuesta: null,
    createdAt: '2026-06-10T00:00:00',
  },
};

export interface MockData {
  reparaciones?: unknown[];
  equipos?: unknown[];
  clientes?: unknown[];
  repuestos?: unknown[];
  articulos?: unknown[];
  /** Sobrescribe la respuesta de /suscripcion (p. ej. para gating PRO). */
  suscripcion?: Record<string, unknown>;
  /** Estado inicial del seguimiento público; el approve/reject lo muta. */
  seguimiento?: Record<string, unknown>;
  /** Respuesta de /reparaciones/:id/cobros. */
  cobros?: Record<string, unknown>;
  /** Respuesta de /reparaciones/:id/recibo. */
  recibo?: Record<string, unknown>;
}

/** Mockea toda la API (/api/**) a nivel de red, así los E2E no dependen del backend. */
export const mockApi = async (page: Page, data: MockData = {}) => {
  const { reparaciones = [], equipos = [], clientes = [], repuestos = [], articulos = [] } = data;
  const suscripcion = data.suscripcion ?? defaultSuscripcion;
  const cobros = data.cobros ?? { total: 0, cobrado: 0, saldo: 0, pagado: false, cobros: [] };
  // Estado mutable del seguimiento (para que aprobar/rechazar cambie el badge al refetch).
  const seguimiento = JSON.parse(JSON.stringify(data.seguimiento ?? defaultSeguimiento));

  // Solo interceptamos el backend (localhost:8080), NO los módulos que Vite
  // sirve en dev desde /src/api/... (un glob **/api/** los pisaría).
  await page.route((url) => url.origin === 'http://localhost:8080', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const method = req.method();

    // Auth
    if (pathname.endsWith('/api/auth/login') && method === 'POST') {
      return route.fulfill({ json: { token: futureToken(), type: 'Bearer', email: 'admin@mvgr.com' } });
    }

    // Ingreso rápido
    if (pathname.endsWith('/api/reparaciones/ingreso-rapido') && method === 'POST') {
      return route.fulfill({
        status: 201,
        json: { clienteId: 1, equipoId: 1, clienteNuevo: true, reparacion: { id: 999, equipoId: 1 } },
      });
    }

    // Update de reparación (PUT): el modo "nuevo" con detalles hace ingreso-rápido + este PUT
    if (/\/api\/reparaciones\/\d+$/.test(pathname) && method === 'PUT') {
      const id = Number(pathname.match(/reparaciones\/(\d+)$/)![1]);
      return route.fulfill({ json: { id, ...(req.postDataJSON() as object) } });
    }

    // Cambiar estado: PATCH /api/reparaciones/:id/estado (body = "ESTADO")
    if (/\/api\/reparaciones\/\d+\/estado$/.test(pathname) && method === 'PATCH') {
      const id = Number(pathname.match(/reparaciones\/(\d+)\/estado/)![1]);
      const estado = (req.postDataJSON() as { estado?: string })?.estado;
      return route.fulfill({ json: { id, estado } });
    }

    // Alta de reparación contra equipo existente
    if (pathname.endsWith('/api/reparaciones') && method === 'POST') {
      return route.fulfill({ status: 201, json: { id: 1000, ...(req.postDataJSON() as object) } });
    }

    // Recibo de una reparación
    if (/\/api\/reparaciones\/\d+\/recibo$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: data.recibo ?? {} });
    }

    // Cobros de una reparación
    if (/\/api\/reparaciones\/\d+\/cobros$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: cobros });
    }
    if (/\/api\/reparaciones\/\d+\/cobros$/.test(pathname) && method === 'POST') {
      const body = req.postDataJSON() as { monto?: number; metodo?: string };
      return route.fulfill({ status: 201, json: { id: 1, fecha: '2026-06-22T10:00:00', ...body } });
    }

    // Listados (GET)
    if (pathname.endsWith('/api/reparaciones') && method === 'GET') {
      const estado = url.searchParams.get('estado');
      const items = estado
        ? (reparaciones as { estado?: string }[]).filter((r) => r.estado === estado)
        : reparaciones;
      return route.fulfill({ json: pageOf(items) });
    }
    if (pathname.endsWith('/api/equipos') && method === 'GET') return route.fulfill({ json: pageOf(equipos) });
    if (pathname.endsWith('/api/clientes') && method === 'GET') return route.fulfill({ json: pageOf(clientes) });
    if (pathname.endsWith('/api/repuestos') && method === 'GET') return route.fulfill({ json: pageOf(repuestos) });
    if (pathname.includes('/api/repuestos/reparacion/')) return route.fulfill({ json: pageOf([]) });

    // Inventario
    if (pathname.endsWith('/api/inventario') && method === 'GET') return route.fulfill({ json: pageOf(articulos) });
    if (pathname.endsWith('/api/inventario') && method === 'POST') {
      return route.fulfill({ status: 201, json: { id: 1, stock: 0, ...(req.postDataJSON() as object) } });
    }

    // Seguimiento público: aprobar / rechazar presupuesto (muta el estado)
    const accionMatch = pathname.match(/\/api\/seguimiento\/[^/]+\/presupuesto\/(aprobar|rechazar)$/);
    if (accionMatch && method === 'POST') {
      if (seguimiento.presupuesto) {
        seguimiento.presupuesto.estado = accionMatch[1] === 'aprobar' ? 'APROBADO' : 'RECHAZADO';
      }
      return route.fulfill({ json: {} });
    }

    // Seguimiento público (GET)
    if (pathname.includes('/api/seguimiento/') && method === 'GET') {
      return route.fulfill({ json: seguimiento });
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
      return route.fulfill({ json: suscripcion });
    }

    // Default: lista vacía / OK
    return route.fulfill({ json: pageOf([]) });
  });
};
