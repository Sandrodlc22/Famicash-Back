/**
 * Configuración de roles, vistas permitidas y permisos en FamiCash
 * Vistas disponibles en Frontend:
 * - 'expense': Registro de ingresos, gastos y transferencias (VistaIngresoMonto)
 * - 'summary': Métricas globales, presupuesto, categorías e historial (VistaResumen)
 * - 'accounts': Gestión de cuentas bancarias y saldos (VistaCuentas)
 * - 'profile': Datos del usuario, seguridad, familiares y logout (VistaPerfil)
 */

export const ROLE_CONFIG = {
  'Administrador Familiar': {
    descripcion: 'Acceso total y administración de miembros, presupuestos y cuentas',
    vistasPermitidas: ['summary', 'expense', 'accounts', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      puedeGestionarCuentas: true,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: true,
      puedeGestionarMiembros: true
    }
  },
  'Esposo / Padre': {
    descripcion: 'Gestión financiera completa del hogar',
    vistasPermitidas: ['summary', 'expense', 'accounts', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      puedeGestionarCuentas: true,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: true,
      puedeGestionarMiembros: true
    }
  },
  'Esposa / Madre': {
    descripcion: 'Gestión financiera completa del hogar',
    vistasPermitidas: ['summary', 'expense', 'accounts', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      puedeGestionarCuentas: true,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: true,
      puedeGestionarMiembros: true
    }
  },
  'Hijo / Hija': {
    descripcion: 'Registro de gastos propios y consulta básica',
    vistasPermitidas: ['expense', 'summary', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      puedeGestionarCuentas: false,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: false,
      puedeGestionarMiembros: false
    }
  },
  'Familiar': {
    descripcion: 'Registro y consulta personal de gastos',
    vistasPermitidas: ['expense', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      puedeGestionarCuentas: false,
      puedeVerResumen: false,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: false,
      puedeGestionarMiembros: false
    }
  },
  'Miembro Familiar': {
    descripcion: 'Registro y consulta de movimientos',
    vistasPermitidas: ['expense', 'summary', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      puedeGestionarCuentas: false,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: false,
      puedeGestionarMiembros: false
    }
  }
};

const DEFAULT_ROLE_NAME = 'Administrador Familiar';

export function getRoleConfig(roleName) {
  const normalized = roleName?.trim();
  const config = ROLE_CONFIG[normalized] || ROLE_CONFIG[DEFAULT_ROLE_NAME];
  return {
    rol: normalized || DEFAULT_ROLE_NAME,
    ...config
  };
}
