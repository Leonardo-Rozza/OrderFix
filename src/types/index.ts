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
}

// Datos derivados del JWT (decodificado en el front, solo para mostrar)
export interface TokenClaims {
  sub: string; // email
  role?: string;
  tallerId?: number;
  exp?: number;
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
}

// ========== SUSCRIPCIÓN / PLAN ==========
export type Plan = 'FREE' | 'PRO';
export type EstadoSuscripcion = 'TRIAL' | 'ACTIVA' | 'VENCIDA' | 'CANCELADA';

export interface Suscripcion {
  plan: Plan;
  estado: EstadoSuscripcion;
  fechaInicio: string | null;
  fechaFinTrial: string | null;
  proximoCobro: string | null;
  reparacionesEsteMes: number;
  limiteReparacionesMes: number | null; // null = ilimitado (PRO)
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
}

// ========== CLIENTE ==========
export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
}

export interface ClienteCreate {
  nombre: string;
  apellido: string;
  telefono: string;
  email?: string;
  direccion?: string;
}

export interface ClienteUpdate extends Partial<ClienteCreate> {
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
  // Enriquecido en el front (join client-side); el backend no lo anida
  cliente?: Cliente;
}

export interface EquipoCreate {
  marca: string;
  modelo: string;
  imei?: string;
  color?: string;
  descripcion?: string;
  clienteId: number;
}

export interface EquipoUpdate extends Partial<EquipoCreate> {
  id: number;
}

// ========== REPARACIÓN ==========
export type EstadoReparacion =
  | 'INGRESADO'
  | 'EN_PROCESO'
  | 'ESPERANDO_REPUESTO'
  | 'COMPLETADO'
  | 'ENTREGADO';

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
  total?: number | null;
  totalRepuestos?: number | null;
  patronDesbloqueo?: string | null;
  pinDesbloqueo?: string | null;
  accesorios?: string | null;
  condicionesIngreso?: string | null;
  observaciones?: string | null;
  tecnicoId?: number | null;
  tecnicoNombre?: string | null;
  fotos?: string[];
  // Enriquecido en el front (join client-side)
  equipo?: Equipo;
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
  presupuesto: number | null;
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
  fotos?: string[];
}

export interface ReparacionUpdate extends Partial<ReparacionCreate> {
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
}

export interface RepuestoCreate {
  nombre: string;
  descripcion?: string;
  precio: number;
  reparacionId?: number;
}

export interface RepuestoUpdate extends Partial<RepuestoCreate> {
  id: number;
}
