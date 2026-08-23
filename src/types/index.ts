// Tipos base — alineados al contrato del backend OrdenFix

// ========== AUTH ==========
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombreTaller: string;
  telefonoTaller?: string;
  nombreAdmin: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type: string; // "Bearer"
  email: string;
  /** false = mostrar banner "Confirmá tu email" (verificación suave: puede operar igual). */
  emailVerificado: boolean;
}

// Datos derivados del JWT (decodificado en el front, solo para mostrar)
export interface TokenClaims {
  sub: string; // email
  role?: string;
  tallerId?: number;
  exp?: number;
}

/** Identidad visible de la sesión autenticada (GET /api/perfil). */
export interface Perfil {
  usuario: {
    id: number;
    username: string;
    email: string;
    role: Rol;
  };
  taller: {
    id: number;
    nombre: string;
    telefono: string | null;
  };
}

// ========== USUARIOS / EMPLEADOS ==========
export type Rol = 'ADMIN' | 'USER';

export interface Usuario {
  id: number;
  username: string;
  email: string;
  role: Rol;
  active: boolean;
}

export interface UsuarioCreate {
  username: string;
  email: string;
  password: string;
  role?: Rol;
}

export interface UsuarioUpdate {
  role?: Rol;
  active?: boolean;
}

export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  /** Código estable para errores de dominio que la UI puede resolver inline. */
  code?: string;
  /** Contexto estructurado del conflicto; nunca debe usarse como mensaje visible crudo. */
  details?: Record<string, unknown>;
}

// ========== SUSCRIPCIÓN / PLAN ==========
export type Plan = 'FREE' | 'PRO';
export type EstadoSuscripcion = 'TRIAL' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA';

// Flags de funciones según el plan (PRO habilita estas; FREE en false)
export interface Funciones {
  inventario: boolean;
  cobros: boolean;
  empleadosMultiples: boolean;
}

export interface Suscripcion {
  plan: Plan;
  estado: EstadoSuscripcion;
  fechaInicio: string | null;
  fechaFinTrial: string | null;
  proximoCobro: string | null;
  reparacionesEsteMes: number;
  limiteReparacionesMes: number | null; // null = ilimitado (PRO)
  funciones: Funciones;
}

// Respuesta del checkout de MercadoPago (POST /api/pagos/suscripcion)
export interface CheckoutResponse {
  preapprovalId: string;
  initPoint: string; // URL a la que se redirige al usuario
}

// Métricas del dashboard (GET /api/dashboard)
export interface DashboardStats {
  reparacionesPorEstado: Record<EstadoReparacion, number>;
  totalReparaciones: number;
  reparacionesEsteMes: number;
  equiposListos: number;
  plan: Plan;
  estadoSuscripcion: EstadoSuscripcion;
  limiteReparacionesMes: number | null;
  articulosStockBajo?: number;
  ultimasReparaciones?: Reparacion[];
}

// ========== CLIENTE ==========
export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  // Agregados denormalizados por el backend en el listado
  equiposCount?: number;
  reparacionesCount?: number;
  ultimaVisita?: string | null;
}

export interface ClienteCreate {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  direccion?: string;
}

export interface ClienteUpdate extends ClienteCreate {
  id: number;
}

// ========== EQUIPO ==========
export interface Equipo {
  id: number;
  marca: string;
  modelo: string;
  imei: string | null;
  color: string | null;
  descripcion: string | null;
  clienteId: number;
  // Denormalizado por el backend en el listado
  clienteNombre?: string;
  clienteApellido?: string;
  clienteTelefono?: string;
  reparacionesCount?: number;
}

export interface EquipoCreate {
  marca: string;
  modelo: string;
  imei?: string;
  color?: string;
  descripcion?: string;
  clienteId: number;
}

export interface EquipoUpdate extends EquipoCreate {
  id: number;
}

// ========== REPARACIÓN ==========
export type EstadoReparacion =
  | 'INGRESADO'
  | 'EN_DIAGNOSTICO'
  | 'PRESUPUESTADO'
  | 'EN_PROCESO'
  | 'ESPERANDO_REPUESTO'
  | 'ESPERANDO_ADICIONAL'
  | 'NO_REPARABLE'
  | 'COMPLETADO'
  | 'LISTO_SIN_REPARAR'
  | 'ENTREGADO'
  | 'ABANDONADO'
  | 'CANCELADO';

/** Dimensión de pago de la reparación, independiente del estado (derivada por el backend). */
export type EstadoPago = 'SIN_COBRAR' | 'PARCIAL' | 'PAGADO';

/** Cuenta vinculada al equipo (iCloud / FRP): riesgo de no poder entregarlo activado. */
export type CuentaVinculada = 'NINGUNA' | 'ICLOUD' | 'GOOGLE' | 'OTRA';

/** Momento de una foto: prueba de condición de entrada o del trabajo hecho (QA). */
export type MomentoFoto = 'INGRESO' | 'POST_REPARACION';

export interface Foto {
  url: string;
  momento: MomentoFoto;
}

export interface Reparacion {
  id: number;
  equipoId: number;
  descripcionProblema: string;
  estado: EstadoReparacion;
  precioEstimado: number | null;
  precioFinal: number | null;
  fechaIngreso: string | null;
  fechaEstimadaEntrega: string | null;
  fechaEntrega: string | null;
  // Agregados por el backend (orden de trabajo ampliada / seguimiento)
  codigoSeguimiento?: string | null;
  /** Correlativo por taller (ORD-2026-0042), inmutable; null en datos viejos. */
  numeroOrden?: string | null;
  total?: number | null;
  totalRepuestos?: number | null;
  /** Suma de cobros (0 en planes FREE, que no usan cobros). */
  cobrado?: number | null;
  /** max(0, total - cobrado). */
  saldo?: number | null;
  /** max(0, cobrado - total): inconsistencia histórica que requiere revisión. */
  excedente?: number | null;
  requiereRevision?: boolean;
  estadoPago?: EstadoPago;
  accesorios?: string | null;
  condicionesIngreso?: string | null;
  observaciones?: string | null;
  tecnicoId?: number | null;
  tecnicoNombre?: string | null;
  /** BREAKING contrato v2: antes era string[]. */
  fotos?: Foto[];
  // Flags de riesgo del ingreso (contrato §4.5)
  mojado?: boolean;
  trabajoEnPlaca?: boolean;
  noTesteableAlIngreso?: boolean;
  tieneBloqueoPantalla?: boolean;
  tieneCuentaVinculada?: CuentaVinculada;
  clienteConoceCredenciales?: boolean;
  /** Derivado (solo lectura): cuenta activa sin credenciales → bandera roja. */
  riesgoCuentaSinCredenciales?: boolean;
  // Entrega y garantía (contrato §4.5)
  /** Cuándo el cliente retiró conforme; se sella sola al pasar a ENTREGADO. */
  fechaConformidadEntrega?: string | null;
  garantiaDias?: number | null;
  garantiaInicio?: string | null;
  garantiaFin?: string | null;
  garantiaCondiciones?: string | null;
  /** Derivado: la garantía todavía no venció. */
  garantiaVigente?: boolean;
  /** Es un retrabajo en garantía (no consumió cupo del plan). */
  esGarantia?: boolean;
  reparacionOrigenId?: number | null;
  // Denormalizado por el backend (equipo + cliente del equipo)
  equipoMarca?: string;
  equipoModelo?: string;
  clienteId?: number;
  clienteNombre?: string;
  clienteApellido?: string;
  clienteTelefono?: string;
}

/**
 * Secretos del equipo. Viven únicamente en memoria local de la ficha autenticada
 * y nunca deben formar parte de listados, caches globales, logs o analytics.
 */
export interface ReparacionCredenciales {
  patronDesbloqueo: string | null;
  pinDesbloqueo: string | null;
}

/** Respuesta exclusiva de GET /reparaciones/{id}. */
export interface ReparacionDetalle extends Reparacion, ReparacionCredenciales {}

// ========== PRESUPUESTOS ==========
export type PresupuestoEstado = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'VENCIDO';
export type TipoPresupuesto = 'ORIGINAL' | 'ADICIONAL';
export type TipoItemPresupuesto = 'MANO_DE_OBRA' | 'REPUESTO';
export type CalidadRepuesto = 'ORIGINAL' | 'ALTERNATIVO' | 'USADO_REACONDICIONADO';

export interface PresupuestoItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  tipoItem: TipoItemPresupuesto;
  /** Solo para repuestos (null en mano de obra). */
  calidad: CalidadRepuesto | null;
}

export interface Presupuesto {
  id: number;
  reparacionId: number;
  estado: PresupuestoEstado;
  tipo: TipoPresupuesto;
  items: PresupuestoItem[];
  total: number;
  manoDeObraTotal: number;
  repuestosTotal: number;
  validezDias: number;
  validoHasta: string | null;
  /** Derivado: PENDIENTE cuyo validoHasta ya pasó (estado también viene VENCIDO). */
  vencido: boolean;
  observaciones: string | null;
  fechaRespuesta: string | null;
  createdAt: string;
}

export interface PresupuestoItemCreate {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Default del backend: MANO_DE_OBRA. */
  tipoItem?: TipoItemPresupuesto;
  /** Solo aplica a repuestos. */
  calidad?: CalidadRepuesto;
}

export interface PresupuestoCreate {
  items: PresupuestoItemCreate[];
  observaciones?: string;
  /** Default del backend: ORIGINAL. */
  tipo?: TipoPresupuesto;
  /** Default del backend: 7. */
  validezDias?: number;
}

// Seguimiento público del equipo (GET /api/seguimiento/{codigo}, sin token)
export interface Seguimiento {
  codigo: string;
  estado: EstadoReparacion;
  marca: string;
  modelo: string;
  taller: string;
  fechaIngreso: string | null;
  fechaEstimadaEntrega: string | null;
  presupuesto: Presupuesto | null;
}

// Respuesta del link de WhatsApp armado por el backend (GET /api/reparaciones/{id}/whatsapp)
export interface WhatsappLink {
  url: string;
  telefono: string;
  mensaje: string;
  linkSeguimiento: string;
}

export interface ReparacionCreate {
  equipoId: number;
  descripcionProblema: string;
  estado?: EstadoReparacion;
  precioEstimado?: number;
  precioFinal?: number;
  fechaIngreso?: string;
  fechaEstimadaEntrega?: string;
  fechaEntrega?: string;
  // Orden de trabajo ampliada (todo opcional)
  patronDesbloqueo?: string;
  pinDesbloqueo?: string;
  accesorios?: string;
  condicionesIngreso?: string;
  observaciones?: string;
  tecnicoId?: number;
  fotos?: Foto[];
  // Flags de riesgo del ingreso (default backend: false / NINGUNA)
  mojado?: boolean;
  trabajoEnPlaca?: boolean;
  noTesteableAlIngreso?: boolean;
  tieneBloqueoPantalla?: boolean;
  tieneCuentaVinculada?: CuentaVinculada;
  clienteConoceCredenciales?: boolean;
  // Entrega y garantía
  fechaConformidadEntrega?: string;
  garantiaDias?: number;
  garantiaCondiciones?: string;
}

export interface ReparacionUpdate extends ReparacionCreate {
  id: number;
}

// Carga rápida: crea cliente + equipo + reparación en un solo paso
// (POST /api/reparaciones/ingreso-rapido)
export interface IngresoRapidoRequest {
  clienteNombre: string;
  clienteApellido?: string;
  clienteTelefono: string;
  equipoMarca: string;
  equipoModelo: string;
  descripcionProblema: string;
  precioEstimado?: number;
}

export interface IngresoRapidoResponse {
  clienteId: number;
  equipoId: number;
  clienteNuevo: boolean; // false = se reutilizó un cliente existente por teléfono
  reparacion: Reparacion;
}

// ========== REPUESTO ==========
export interface Repuesto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  reparacionId: number | null;
  articuloId?: number | null;
  cantidad?: number | null;
  // Denormalizado: equipo de la reparación asociada (ej: "Samsung A52")
  reparacionEquipo?: string | null;
}

export interface RepuestoCreate {
  nombre: string;
  descripcion?: string;
  precio: number;
  reparacionId?: number;
  // Enlaza al inventario y descuenta stock (opcional)
  articuloId?: number;
  cantidad?: number;
}

export interface RepuestoUpdate extends RepuestoCreate {
  id: number;
}

// ========== COBROS / CAJA / RECIBO ==========
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'MERCADOPAGO' | 'OTRO';
export type EstadoCobro = 'ACTIVO' | 'ANULADO';

export interface Cobro {
  id: number;
  reparacionId: number;
  monto: number;
  metodo: MetodoPago;
  /** Número de operación o identificación manual visible por separado. */
  referencia: string | null;
  observaciones: string | null;
  fecha: string;
  estado: EstadoCobro;
  anuladoAt: string | null;
  anuladoPorNombre: string | null;
  motivoAnulacion: string | null;
}

export interface CobroCreate {
  monto: number;
  metodo: MetodoPago;
  referencia?: string;
  observaciones?: string;
}

export interface CobroAnulacionRequest {
  motivo: string;
}

export interface CobrosReparacion {
  total: number;
  cobrado: number;
  saldo: number;
  excedente: number;
  requiereRevision: boolean;
  pagado: boolean;
  cobros: Cobro[];
}

export interface CajaResumen {
  desde: string;
  hasta: string;
  totalCobrado: number;
  cantidad: number;
  porMetodo: Record<MetodoPago, number>;
  cobros: Cobro[];
}

export interface ReciboItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Recibo {
  reparacionId: number;
  codigoSeguimiento: string | null;
  estado: EstadoReparacion;
  tallerNombre: string;
  tallerTelefono: string | null;
  clienteNombre: string;
  clienteApellido: string;
  clienteTelefono: string | null;
  equipoMarca: string;
  equipoModelo: string;
  descripcionProblema: string;
  repuestos: ReciboItem[];
  manoDeObra: number;
  totalRepuestos: number;
  total: number;
  cobrado: number;
  saldo: number;
  pagado: boolean;
  fecha: string;
}

// ========== INVENTARIO ==========
export interface Articulo {
  id: number;
  nombre: string;
  descripcion: string | null;
  sku: string | null;
  precio: number;
  costo: number | null;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  stockBajo: boolean;
}

export interface ArticuloCreate {
  nombre: string;
  descripcion?: string;
  sku?: string;
  precio: number;
  costo?: number;
  stock?: number;
  stockMinimo?: number;
}

export interface ArticuloUpdate {
  id: number;
  nombre: string;
  descripcion?: string;
  sku?: string;
  precio: number;
  costo?: number;
  stockMinimo?: number;
}

export interface AjusteStock {
  delta: number;
  motivo?: string;
}
