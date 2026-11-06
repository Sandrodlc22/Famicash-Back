/**
 * Configuración de roles, vistas permitidas y permisos en FamiCash
 * Vistas disponibles en Frontend:
 * - 'expense': Registro de ingresos, gastos y transferencias (VistaIngresoMonto)
 * - 'summary': Métricas globales, presupuesto, categorías e historial (VistaResumen)
 * - 'accounts': Gestión de cuentas bancarias y saldos (VistaCuentas)
 * - 'admin': Panel de control exclusivo para el Administrador Familiar (VistaAdmin)
 * - 'profile': Datos del usuario, seguridad, familiares y logout (VistaPerfil)
 */

export const ROLE_CONFIG = {
  'Administrador Familiar': {
    descripcion: 'Acceso total y administración de miembros, presupuestos y cuentas',
    vistasPermitidas: ['summary', 'expense', 'accounts', 'admin', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      esAdmin: true,
      puedeGestionarCuentas: true,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: true,
      puedeGestionarMiembros: true
    }
  },
  'Esposo / Padre': {
    descripcion: 'Gestión financiera de gastos, ingresos y cuentas del hogar',
    vistasPermitidas: ['summary', 'expense', 'accounts', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      esAdmin: false,
      puedeGestionarCuentas: true,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: true,
      puedeGestionarMiembros: false
    }
  },
  'Esposa / Madre': {
    descripcion: 'Gestión financiera de gastos, ingresos y cuentas del hogar',
    vistasPermitidas: ['summary', 'expense', 'accounts', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      esAdmin: false,
      puedeGestionarCuentas: true,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: true,
      puedeGestionarMiembros: false
    }
  },
  'Hijo / Hija': {
    descripcion: 'Registro de gastos propios y consulta básica',
    vistasPermitidas: ['expense', 'summary', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      esAdmin: false,
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
      esAdmin: false,
      puedeGestionarCuentas: false,
      puedeVerResumen: false,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: false,
      puedeGestionarMiembros: false
    }
  },
  'Miembro Familiar': {
    descripcion: 'Registro y consulta de movimientos familiares',
    vistasPermitidas: ['expense', 'summary', 'profile'],
    vistaInicial: 'expense',
    permisos: {
      esAdmin: false,
      puedeGestionarCuentas: false,
      puedeVerResumen: true,
      puedeRegistrarGastos: true,
      puedeEliminarMovimientos: false,
      puedeGestionarMiembros: false
    }
  }
};

const DEFAULT_ROLE_NAME = 'Miembro Familiar';

export function getRoleConfig(roleName) {
  const normalized = roleName?.trim();
  const config = ROLE_CONFIG[normalized] || ROLE_CONFIG[DEFAULT_ROLE_NAME];
  return {
    rol: normalized || DEFAULT_ROLE_NAME,
    ...config
  };
}
