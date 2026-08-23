import type { BrowserContext, Page } from '@playwright/test';

// --- JWT de mentira con exp futura (para pasar el guard de sesión) ---
const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

export const futureToken = (role = 'ROLE_ADMIN') =>
  `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'admin@mvgr.com', role, exp: Math.floor(Date.now() / 1000) + 3600 })}.firma`;

/** Inyecta sesión en localStorage (formato de zustand persist) antes de cargar la app. */
export const seedAuth = async (
  context: BrowserContext,
  token = futureToken(),
  email = 'admin@mvgr.com',
) => {
  const value = JSON.stringify({
    state: { token, email, isAuthenticated: true },
    version: 0,
  });
  await context.addInitScript((v) => {
    window.localStorage.setItem('ordenfix-auth', v as string);
  }, value);
};

const normalizeSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

/** Emula el contrato real de búsqueda/paginación para que E2E no oculte truncamientos. */
const pageOf = <T>(items: T[], url?: URL) => {
  const q = normalizeSearch(url?.searchParams.get('q')?.trim() ?? '');
  const filtered = q
    ? items.filter((item) => normalizeSearch(JSON.stringify(item)).includes(q))
    : items;
  const [sortField, sortDirection] = (url?.searchParams.get('sort') ?? '').split(',');
  const ordered = sortField
    ? [...filtered].sort((left, right) => {
        const leftValue = typeof left === 'object' && left !== null
          ? (left as Record<string, unknown>)[sortField]
          : left;
        const rightValue = typeof right === 'object' && right !== null
          ? (right as Record<string, unknown>)[sortField]
          : right;
        const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'es', {
              numeric: true,
              sensitivity: 'base',
            });
        return sortDirection?.toLowerCase() === 'desc' ? -comparison : comparison;
      })
    : filtered;
  const requestedPage = Math.max(0, Number(url?.searchParams.get('page') ?? 0) || 0);
  const size = Math.max(1, Number(url?.searchParams.get('size') ?? 20) || 20);
  const totalPages = ordered.length === 0 ? 0 : Math.ceil(ordered.length / size);
  const start = requestedPage * size;

  return {
    content: ordered.slice(start, start + size),
    page: { size, number: requestedPage, totalElements: ordered.length, totalPages },
  };
};

const defaultSuscripcion = {
  plan: 'FREE',
  estado: 'TRIAL',
  fechaInicio: null,
  fechaFinTrial: null,
  proximoCobro: null,
  reparacionesEsteMes: 0,
  limiteReparacionesMes: null,
  funciones: { inventario: true, cobros: true, empleadosMultiples: true },
};

export const defaultPerfil = {
  usuario: {
    id: 1,
    username: 'Administrador OrdenFix',
    email: 'admin@mvgr.com',
    role: 'ADMIN',
  },
  taller: {
    id: 1,
    nombre: 'MVGR Reparaciones',
    telefono: '1155550000',
  },
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

const defaultReparacionDetalle = {
  id: 1,
  equipoId: 1,
  descripcionProblema: 'Pantalla rota',
  estado: 'ENTREGADO',
  precioEstimado: 50_000,
  precioFinal: 50_000,
  fechaIngreso: '2026-08-01',
  fechaEstimadaEntrega: '2026-08-05',
  fechaEntrega: '2026-08-05',
  codigoSeguimiento: 'ABC123',
  numeroOrden: 'ORD-2026-0001',
  total: 50_000,
  totalRepuestos: 0,
  cobrado: 10_000,
  saldo: 40_000,
  excedente: 0,
  requiereRevision: false,
  estadoPago: 'PARCIAL',
  patronDesbloqueo: null,
  pinDesbloqueo: null,
  accesorios: null,
  condicionesIngreso: null,
  observaciones: null,
  tecnicoId: null,
  tecnicoNombre: null,
  fotos: [],
  mojado: false,
  trabajoEnPlaca: false,
  noTesteableAlIngreso: false,
  tieneBloqueoPantalla: false,
  tieneCuentaVinculada: 'NINGUNA',
  clienteConoceCredenciales: false,
  riesgoCuentaSinCredenciales: false,
  fechaConformidadEntrega: '2026-08-05',
  garantiaDias: 90,
  garantiaInicio: '2026-08-05',
  garantiaFin: '2042-12-31',
  garantiaCondiciones: 'Cubre el trabajo realizado',
  garantiaVigente: true,
  esGarantia: false,
  reparacionOrigenId: null,
  equipoMarca: 'Apple',
  equipoModelo: 'iPhone 13',
  clienteId: 1,
  clienteNombre: 'Ana',
  clienteApellido: 'Gómez',
  clienteTelefono: '1155550000',
};

export interface MockData {
  /** Identidad visible del usuario y taller autenticados. */
  perfil?: Record<string, unknown>;
  reparaciones?: unknown[];
  /** Reparación denormalizada de GET /reparaciones/:id. */
  reparacionDetalle?: Record<string, unknown>;
  /** Sub-listado simple de GET /reparaciones/equipo/:id. */
  reparacionesEquipo?: unknown[];
  equipos?: unknown[];
  clientes?: unknown[];
  repuestos?: unknown[];
  /** Sub-listado de repuestos asociados a una reparación. */
  repuestosReparacion?: unknown[];
  /** Sub-listado simple de presupuestos de una reparación. */
  presupuestos?: unknown[];
  articulos?: unknown[];
  usuarios?: unknown[];
  /** Sobrescribe la respuesta de /suscripcion (p. ej. para gating PRO). */
  suscripcion?: Record<string, unknown>;
  /** Estado inicial del seguimiento público; el approve/reject lo muta. */
  seguimiento?: Record<string, unknown>;
  /** Respuesta de /reparaciones/:id/cobros. */
  cobros?: Record<string, unknown>;
  /** Respuesta de /reparaciones/:id/recibo. */
  recibo?: Record<string, unknown>;
  /** Respuesta de /caja para pruebas de filtros y responsive. */
  caja?: Record<string, unknown>;
}

/** Mockea toda la API (/api/**) a nivel de red, así los E2E no dependen del backend. */
export const mockApi = async (page: Page, data: MockData = {}) => {
  const { reparaciones = [], equipos = [], clientes = [], repuestos = [], articulos = [] } = data;
  const reparacionDetalle = { ...defaultReparacionDetalle, ...(data.reparacionDetalle ?? {}) };
  const reparacionesEquipo = data.reparacionesEquipo ?? [];
  const repuestosReparacion = data.repuestosReparacion ?? [];
  const presupuestos = data.presupuestos ?? [];
  const usuarios = data.usuarios ?? [];
  const suscripcion = data.suscripcion ?? defaultSuscripcion;
  const perfil = data.perfil ?? defaultPerfil;
  const cobros = data.cobros ?? {
    total: 0,
    cobrado: 0,
    saldo: 0,
    excedente: 0,
    requiereRevision: false,
    pagado: false,
    cobros: [],
  };
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
      const body = req.postDataJSON() as { monto?: number; metodo?: string; referencia?: string; observaciones?: string };
      const reparacionId = Number(pathname.match(/reparaciones\/(\d+)\/cobros$/)?.[1]);
      return route.fulfill({
        status: 201,
        json: {
          id: 1,
          reparacionId,
          fecha: '2026-06-22T10:00:00',
          referencia: null,
          observaciones: null,
          estado: 'ACTIVO',
          anuladoAt: null,
          anuladoPorNombre: null,
          motivoAnulacion: null,
          ...body,
        },
      });
    }
    const anulacionCobroMatch = pathname.match(/\/api\/reparaciones\/(\d+)\/cobros\/(\d+)\/anulacion$/);
    if (anulacionCobroMatch && method === 'POST') {
      const cobroId = Number(anulacionCobroMatch[2]);
      const body = req.postDataJSON() as { motivo?: string };
      const movimientos = Array.isArray(cobros.cobros)
        ? cobros.cobros as Array<Record<string, unknown>>
        : [];
      const actual = movimientos.find((movimiento) => movimiento.id === cobroId) ?? {
        id: cobroId,
        reparacionId: Number(anulacionCobroMatch[1]),
        monto: 0,
        metodo: 'OTRO',
        referencia: null,
        observaciones: null,
        fecha: '2026-06-22T10:00:00',
      };
      const anulado = {
        ...actual,
        estado: 'ANULADO',
        anuladoAt: '2026-08-23T12:00:00',
        anuladoPorNombre: 'Administrador OrdenFix',
        motivoAnulacion: body.motivo ?? null,
      };
      const historiaActualizada = movimientos.some((movimiento) => movimiento.id === cobroId)
        ? movimientos.map((movimiento) => movimiento.id === cobroId ? anulado : movimiento)
        : [...movimientos, anulado];
      cobros.cobros = historiaActualizada;
      const total = typeof cobros.total === 'number' ? cobros.total : 0;
      const cobradoActivo = historiaActualizada.reduce((sum, movimiento) => (
        movimiento.estado === 'ANULADO'
          ? sum
          : sum + (typeof movimiento.monto === 'number' ? movimiento.monto : 0)
      ), 0);
      cobros.cobrado = cobradoActivo;
      cobros.saldo = Math.max(total - cobradoActivo, 0);
      cobros.excedente = Math.max(cobradoActivo - total, 0);
      cobros.requiereRevision = Number(cobros.excedente) > 0;
      cobros.pagado = total > 0 && cobradoActivo >= total;
      reparacionDetalle.cobrado = cobradoActivo;
      reparacionDetalle.saldo = cobros.saldo;
      reparacionDetalle.excedente = cobros.excedente;
      reparacionDetalle.requiereRevision = cobros.requiereRevision;
      reparacionDetalle.estadoPago = cobros.pagado
        ? 'PAGADO'
        : cobradoActivo > 0
          ? 'PARCIAL'
          : 'SIN_COBRAR';
      return route.fulfill({ json: anulado });
    }

    // Subrecursos de una reparación: el backend responde arrays simples.
    if (/\/api\/reparaciones\/\d+\/presupuestos$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: presupuestos });
    }
    if (/\/api\/repuestos\/reparacion\/\d+$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: repuestosReparacion });
    }
    if (/\/api\/reparaciones\/equipo\/\d+$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: reparacionesEquipo });
    }

    // Detalle denormalizado (equipo + cliente), después de sus subrecursos.
    if (/\/api\/reparaciones\/\d+$/.test(pathname) && method === 'GET') {
      return route.fulfill({ json: reparacionDetalle });
    }

    // Caja por período
    if (pathname.endsWith('/api/caja') && method === 'GET') {
      return route.fulfill({
        json:
          data.caja ??
          {
            desde: '2026-08-13',
            hasta: '2026-08-13',
            totalCobrado: 0,
            cantidad: 0,
            porMetodo: {},
            cobros: [],
          },
      });
    }

    // Listados (GET)
    if (pathname.endsWith('/api/reparaciones') && method === 'GET') {
      const estado = url.searchParams.get('estado');
      const items = estado
        ? (reparaciones as { estado?: string }[]).filter((r) => r.estado === estado)
        : reparaciones;
      return route.fulfill({ json: pageOf(items, url) });
    }
    if (pathname.endsWith('/api/equipos') && method === 'GET') return route.fulfill({ json: pageOf(equipos, url) });
    const equiposClienteMatch = pathname.match(/\/api\/equipos\/cliente\/(\d+)$/);
    if (equiposClienteMatch && method === 'GET') {
      const clienteId = Number(equiposClienteMatch[1]);
      const items = (equipos as { clienteId?: number }[]).filter((equipo) => equipo.clienteId === clienteId);
      return route.fulfill({ json: items });
    }
    if (pathname.endsWith('/api/clientes') && method === 'GET') return route.fulfill({ json: pageOf(clientes, url) });
    if (pathname.endsWith('/api/repuestos') && method === 'GET') return route.fulfill({ json: pageOf(repuestos, url) });
    if (pathname.endsWith('/api/usuarios') && method === 'GET') return route.fulfill({ json: usuarios });

    // Inventario
    if (pathname.endsWith('/api/inventario') && method === 'GET') return route.fulfill({ json: pageOf(articulos, url) });
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
          limiteReparacionesMes: null,
        },
      });
    }

    // Suscripción
    if (pathname.endsWith('/api/suscripcion')) {
      return route.fulfill({ json: suscripcion });
    }

    // Perfil autenticado. Es explícito para detectar cambios de contrato en E2E.
    if (pathname.endsWith('/api/perfil') && method === 'GET') {
      return route.fulfill({ json: perfil });
    }

    // Default: lista vacía / OK
    return route.fulfill({ json: pageOf([]) });
  });
};
