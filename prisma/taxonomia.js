// ============================================================
// Taxonomía oficial FamiCash (Brief sección 3)
// Los nombres se conservan EXACTAMENTE (prefijos numéricos y guiones bajos)
// porque los filtros y tablas dinámicas de Excel dependen de ellos.
// ============================================================

export const TAXONOMIA = [
  {
    codigo: 'I_INGRESOS',
    tipo: 'INGRESO',
    persona: 'FAMILIA',
    subcategorias: [
      { codigo: '_1_SUELDOS', detalles: ['Sueldo Anthony', 'Sueldo Vanessa'] },
      { codigo: '_2_PENSION', persona: 'LARA', detalles: ['Pensión Lara'] },
      { codigo: '_3_INGRESO ADICIONAL 1', detalles: ['Ejemplo 1'] },
      { codigo: '_4_INGRESO ADICIONAL 2', detalles: ['Ejemplo 2'] }
    ]
  },
  {
    codigo: 'II_GENERALES',
    tipo: 'GASTO',
    persona: 'FAMILIA',
    subcategorias: [
      { codigo: '_1_VIVIENDA', detalles: ['Alquiler departamento'] },
      { codigo: '_2_MANTENIMIENTO', detalles: ['Agua', 'Mantenimiento departamento', 'Otros'] },
      {
        codigo: '_3_SERVICIOS_BASICOS',
        detalles: [
          'Internet y telefono- Claro',
          'Luz',
          'Celular Anthony',
          'Otros servicios basicos (nube/netflix/camaras/apps)',
          'Gastos extraordinarios (Reparación, artefactos, mantto)'
        ]
      },
      {
        codigo: '_4_TRANSPORTE',
        detalles: [
          'Gasolina',
          'Transporte Anthony',
          'Transporte Vanessa',
          'Otros Transporte (estacionamientos y peajes, SAT)',
          'Seguro Vehicular',
          'Mantenimiento vehicular - 5 KM',
          'Mecánico o reparación vehicular',
          'Revisión Técnica',
          'Soat'
        ]
      },
      {
        codigo: '_5_PERSONAL_DE_SERVICIO',
        detalles: [
          'Nana',
          'Beneficios Nana (Gratificación, vacaciones, CTS)',
          'Limpieza del hogar',
          'Beneficios Limpieza del hogar (Gratificación, vacaciones, CTS)'
        ]
      },
      {
        codigo: '_6_ALIMENTACION',
        detalles: [
          'Alimentos, utiles de limpieza hogar',
          'Otros Alimentación Anthony (consumos fuera / invitaciones)',
          'Otros Alimentación Vanessa (consumos fuera / invitaciones)',
          'Restaurantes'
        ]
      }
    ]
  },
  {
    codigo: 'III_LARA',
    tipo: 'GASTO',
    persona: 'LARA',
    subcategorias: [
      {
        codigo: '_1_CUIDADO_PERSONAL_LARA',
        detalles: ['Botiquín personal Lara', 'Útiles de aseo Lara', 'Otros Cuidado personal Lara']
      },
      {
        codigo: '_2_EDUCACION_LARA',
        detalles: [
          'Pensión y derecho a matricula',
          'Utiles escolares y de soporte (juguetes/cuentos/libros/muebles de estudio/disfraces)',
          'Uniforme (Casaca y pantalon/polos/short)',
          'Actividades escolares'
        ]
      },
      {
        codigo: '_3_TALLERES_LARA',
        detalles: [
          'Matrícula/Pensión (clases de natación)',
          'Accesorios para el taller (Indumentaria/vestimenta/materiales)',
          'Otros Talleres Lara'
        ]
      },
      { codigo: '_4_VESTIMENTA_LARA', detalles: ['Vestimenta, accesorios y calzado Lara'] },
      // Nota: el original salta del _4 al _6 (no existe _5). Se conserva tal cual.
      {
        codigo: '_6_SALUD_LARA',
        detalles: [
          'Consultas medicas y exámenes (Pediatra/nutricionista/neumologo/otros)',
          'Medicamentos o vitaminas',
          'Seguro privado de salud Lara'
        ]
      },
      {
        codigo: '_7_DIVERSION_LARA',
        detalles: [
          'Fiestas infantiles y regalos (incluye también su fiesta de cumpleaños)',
          'Gastos de diversión Lara (salidas/paseos/viajes)'
        ]
      }
    ]
  },
  {
    codigo: 'IV_VANESSA',
    tipo: 'GASTO',
    persona: 'VANESSA',
    subcategorias: [
      {
        codigo: '_1_CUIDADO_PERSONAL_VANESSA',
        detalles: [
          'Útiles de aseo Vanessa',
          'Cuidado Personal Vanessa (Peluquería/Botiquín/Skin care/Maquillaje)'
        ]
      },
      { codigo: '_2_DEPORTE_VANESSA', detalles: ['Gym, baile o yoga'] },
      {
        codigo: '_3_SALUD_VANESSA',
        detalles: [
          'Consultas medicas',
          'Medicamentos o vitaminas',
          'Seguro privado de salud Vanessa',
          'Otra salud Vanessa'
        ]
      },
      { codigo: '_4_ESTUDIOS_VANESSA', detalles: ['Estudios Vanessa'] },
      { codigo: '_5_VESTIMENTA_VANESSA', detalles: ['Vestimenta, accesorios y calzado Vanessa'] },
      { codigo: '_6_LEGAL_VANESSA', detalles: ['Abogados Vanessa', 'Otros Legal Vanessa'] },
      { codigo: '_7_DIVERSION_VANESSA', detalles: ['Gastos de diversión Vanessa (salidas/paseos/viajes)'] }
    ]
  },
  {
    codigo: 'V_ANTHONY',
    tipo: 'GASTO',
    persona: 'ANTHONY',
    subcategorias: [
      {
        codigo: '_1_CUIDADO_PERSONAL_ANTHONY',
        detalles: ['Útiles de aseo Anthony', 'Cuidado Personal Anthony (Barber, otros)']
      },
      { codigo: '_2_DEPORTE_ANTHONY', detalles: ['Gym'] },
      {
        codigo: '_3_SALUD_ANTHONY',
        detalles: [
          'Consultas medicas Anthony',
          'Medicamentos o vitaminas Anthony',
          'Seguro privado de salud Anthony'
        ]
      },
      { codigo: '_4_ESTUDIOS_ANTHONY', detalles: ['Estudios Anthony'] },
      { codigo: '_5_VESTIMENTA_ANTHONY', detalles: ['Vestimenta, accesorios y calzado Anthony'] },
      { codigo: '_6_DIVERSION_ANTHONY', detalles: ['Gastos de diversión Anthony (salidas/paseos/viajes)'] }
    ]
  },
  {
    codigo: 'VI_AHORRO',
    tipo: 'AHORRO',
    persona: 'FAMILIA',
    subcategorias: [
      { codigo: '_1_AHORRO_VANESSA', persona: 'VANESSA', detalles: ['Ahorro Vanessa'] },
      { codigo: '_2_AHORRO_ANTHONY', persona: 'ANTHONY', detalles: ['Ahorro Anthony'] },
      { codigo: '_3_AHORRO LARA', persona: 'LARA', detalles: ['Ahorro Lara'] }
    ]
  }
];

export const MEDIOS_PAGO = [
  { nombre: 'TC PERSONAL VANESSA', persona: 'VANESSA' },
  { nombre: 'YAPE/PLIN/TRANSFERENCIA VANESSA', persona: 'VANESSA' },
  { nombre: 'TC PERSONAL ANTHONY', persona: 'ANTHONY' },
  { nombre: 'YAPE/PLIN/TRANSFERENCIA ANTHONY', persona: 'ANTHONY' },
  { nombre: 'CUENTA BCP', persona: 'FAMILIA' },
  { nombre: 'EFECTIVO', persona: 'FAMILIA' }
];

// Favoritos iniciales por usuario (subcategorías más frecuentes)
export const FAVORITOS_INICIALES = {
  ANTHONY: ['_6_ALIMENTACION', '_4_TRANSPORTE', '_3_SERVICIOS_BASICOS', '_2_EDUCACION_LARA', '_1_CUIDADO_PERSONAL_ANTHONY', '_2_AHORRO_ANTHONY'],
  VANESSA: ['_6_ALIMENTACION', '_1_CUIDADO_PERSONAL_LARA', '_6_SALUD_LARA', '_1_CUIDADO_PERSONAL_VANESSA', '_4_TRANSPORTE', '_1_AHORRO_VANESSA']
};

