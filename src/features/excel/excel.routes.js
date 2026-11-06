// Exportación, Plantilla Oficial e Importación Excel — formato EXACTO del brief (sección 5):
// Año | Mes | Día | Fecha | Categoría | Subcategoría | Detalle | Monto S/ | Medio de pago | Observaciones
import { Router, raw } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../lib/prisma/prisma.js';
import { AppError } from '../../lib/errors/app-error.js';
import { MESES_ABREV, hoyLima, formatFecha } from '../../lib/utils/fechas.js';
import { construirFiltro, round2 } from '../../lib/utils/filtros.js';

const router = Router();
const COLUMNAS = ['Año', 'Mes', 'Día', 'Fecha', 'Categoría', 'Subcategoría', 'Detalle', 'Monto S/', 'Medio de pago', 'Observaciones'];
const VERDE_OSCURO = 'FF1E5631';
const VERDE_CLARO = 'FFE8F3EC';
const AZUL_GUIA = 'FF0284C7';

function aplicarEstiloHojaMovimientos(ws) {
  ws.columns = [
    { header: 'Año', key: 'anio', width: 8 },
    { header: 'Mes', key: 'mes', width: 8 },
    { header: 'Día', key: 'dia', width: 7 },
    { header: 'Fecha', key: 'fecha', width: 12 },
    { header: 'Categoría', key: 'categoria', width: 18 },
    { header: 'Subcategoría', key: 'subcategoria', width: 30 },
    { header: 'Detalle', key: 'detalle', width: 42 },
    { header: 'Monto S/', key: 'monto', width: 14 },
    { header: 'Medio de pago', key: 'medio', width: 32 },
    { header: 'Observaciones', key: 'obs', width: 38 }
  ];

  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_OSCURO } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  ws.getColumn('fecha').numFmt = '[$-280A]d-mmm';
  ws.getColumn('monto').numFmt = '#,##0.00';
  ws.getColumn('anio').alignment = { horizontal: 'center' };
  ws.getColumn('mes').alignment = { horizontal: 'center' };
  ws.getColumn('dia').alignment = { horizontal: 'center' };
  ws.getColumn('fecha').alignment = { horizontal: 'center' };
}

// ------------------------------------------------------------------ PLANTILLA DESCARGABLE
router.get('/plantilla', async (req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FamiCash';
  wb.created = new Date();

  // Hoja 1: Plantilla lista para llenar y subir
  const ws = wb.addWorksheet('Plantilla_Movimientos', { views: [{ state: 'frozen', ySplit: 1 }] });
  aplicarEstiloHojaMovimientos(ws);

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth();

  const ejemplos = [
    {
      anio: anioActual,
      mes: MESES_ABREV[mesActual],
      dia: '05',
      fecha: new Date(Date.UTC(anioActual, mesActual, 5)),
      categoria: 'II_GENERALES',
      subcategoria: '_6_ALIMENTACION',
      detalle: 'Supermercado (carnes, frutas, verduras y abarrotes)',
      monto: 245.5,
      medio: 'TC PERSONAL VANESSA',
      obs: 'Ejemplo 1: Compras semanales supermercado (puedes borrar o editar esta fila)'
    },
    {
      anio: anioActual,
      mes: MESES_ABREV[mesActual],
      dia: '06',
      fecha: new Date(Date.UTC(anioActual, mesActual, 6)),
      categoria: 'II_GENERALES',
      subcategoria: '_4_TRANSPORTE',
      detalle: 'Gasolina',
      monto: 160.0,
      medio: 'TC PERSONAL ANTHONY',
      obs: 'Ejemplo 2: Tanqueo gasolina Primax'
    },
    {
      anio: anioActual,
      mes: MESES_ABREV[mesActual],
      dia: '07',
      fecha: new Date(Date.UTC(anioActual, mesActual, 7)),
      categoria: 'III_LARA',
      subcategoria: '_2_EDUCACION_LARA',
      detalle: 'Colegio',
      monto: 1150.0,
      medio: 'CUENTA BCP',
      obs: 'Ejemplo 3: Pensión mensual colegio Lara'
    },
    {
      anio: anioActual,
      mes: MESES_ABREV[mesActual],
      dia: '08',
      fecha: new Date(Date.UTC(anioActual, mesActual, 8)),
      categoria: 'I_INGRESOS',
      subcategoria: '_1_SUELDOS',
      detalle: 'Sueldo Anthony',
      monto: 7800.0,
      medio: 'CUENTA BCP',
      obs: 'Ejemplo 4: Abono de sueldo mensual'
    },
    {
      anio: anioActual,
      mes: MESES_ABREV[mesActual],
      dia: '10',
      fecha: new Date(Date.UTC(anioActual, mesActual, 10)),
      categoria: 'VI_AHORRO',
      subcategoria: '_2_AHORRO_ANTHONY',
      detalle: 'Depósito ahorro Anthony',
      monto: 1000.0,
      medio: 'CUENTA BCP',
      obs: 'Ejemplo 5: Aporte mensual fondo de emergencia'
    }
  ];

  for (const ej of ejemplos) {
    ws.addRow(ej);
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    if (r % 2 === 0) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_CLARO } };
      });
    }
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(ws.rowCount, 1), column: COLUMNAS.length } };

  // Hoja 2: Catálogo de valores válidos e instrucciones
  const wsCat = wb.addWorksheet('Catalogo_Referencia', { views: [{ state: 'frozen', ySplit: 1 }] });
  wsCat.columns = [
    { header: 'Categoría (Código)', key: 'cat', width: 20 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Subcategoría (Rubro)', key: 'sub', width: 32 },
    { header: 'Detalles / Conceptos sugeridos', key: 'det', width: 55 },
    { header: 'Medios de pago válidos', key: 'med', width: 34 }
  ];

  const headerCat = wsCat.getRow(1);
  headerCat.height = 22;
  headerCat.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GUIA } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const categorias = await prisma.categoria.findMany({
    where: { activa: true },
    orderBy: { orden: 'asc' },
    include: {
      subcategorias: {
        where: { activa: true },
        orderBy: { orden: 'asc' },
        include: { detalles: { where: { activo: true }, orderBy: { orden: 'asc' } } }
      }
    }
  });
  const medios = await prisma.medioPago.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });

  let idxMed = 0;
  for (const c of categorias) {
    for (const s of c.subcategorias) {
      wsCat.addRow({
        cat: c.codigo,
        tipo: c.tipo,
        sub: s.codigo,
        det: s.detalles.map((d) => d.nombre).join(' | '),
        med: medios[idxMed]?.nombre || ''
      });
      idxMed++;
    }
  }

  const nombre = 'Plantilla_FamiCash_Importacion.xlsx';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  await wb.xlsx.write(res);
  res.end();
});

// ------------------------------------------------------------------ EXPORTAR
router.get('/exportar', async (req, res) => {
  const where = construirFiltro(req.query);
  const filas = await prisma.transaccion.findMany({ where, orderBy: [{ fecha: 'asc' }, { id: 'asc' }] });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FamiCash';
  wb.created = new Date();
  const ws = wb.addWorksheet('Transacciones', { views: [{ state: 'frozen', ySplit: 1 }] });

  aplicarEstiloHojaMovimientos(ws);

  for (const t of filas) {
    const f = t.fecha;
    ws.addRow({
      anio: f.getUTCFullYear(),
      mes: MESES_ABREV[f.getUTCMonth()],
      dia: String(f.getUTCDate()).padStart(2, '0'),
      fecha: new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate())),
      categoria: t.categoriaNombre,
      subcategoria: t.subcategoriaNombre,
      detalle: t.detalleNombre || '',
      monto: Number(t.monto),
      medio: t.medioPagoNombre || '',
      obs: t.observaciones || ''
    });
  }

  for (let r = 2; r <= ws.rowCount; r++) {
    if (r % 2 === 0) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_CLARO } };
      });
    }
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(ws.rowCount, 1), column: COLUMNAS.length } };

  const nombre = `FamiCash_${hoyLima()}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  await wb.xlsx.write(res);
  res.end();
});

// ------------------------------------------------------------------ IMPORTAR
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const MES_IDX = Object.fromEntries(MESES_ABREV.map((m, i) => [norm(m), i]));
MES_IDX.sep = 8;
MES_IDX.sept = 8;
MES_IDX.setiembre = 8;
MES_IDX.septiembre = 8;

// Alias amigables para Categorías por si el usuario escribe "Hogar", "Ingresos", "Lara", etc.
const ALIAS_CATEGORIA = {
  ingresos: 'i_ingresos',
  ingreso: 'i_ingresos',
  'hogar y familia': 'ii_generales',
  hogar: 'ii_generales',
  generales: 'ii_generales',
  lara: 'iii_lara',
  vanessa: 'iv_vanessa',
  anthony: 'v_anthony',
  ahorro: 'vi_ahorro',
  ahorros: 'vi_ahorro'
};

function valorCelda(c) {
  const v = c?.value;
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

function parseMonto(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[S/\s]/g, '').replace(/,/g, '');
  return Number(s);
}

router.post('/importar', raw({ type: () => true, limit: '15mb' }), async (req, res) => {
  const confirmar = req.query.confirmar === 'true';
  if (!req.body?.length) throw new AppError('Adjunta un archivo .xlsx.', 400);

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(req.body);
  } catch {
    throw new AppError('El archivo no es un Excel (.xlsx) válido.', 400);
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new AppError('El Excel no tiene hojas.', 400);

  const colIdx = {};
  ws.getRow(1).eachCell((c, i) => (colIdx[norm(valorCelda(c))] = i));
  const col = (nombre) => colIdx[norm(nombre)];
  for (const req0 of ['Categoría', 'Subcategoría', 'Monto S/']) {
    if (!col(req0)) throw new AppError(`Falta la columna obligatoria "${req0}". Descarga la Plantilla Oficial para guiarte.`, 400);
  }
  if (!col('Fecha') && !(col('Año') && col('Mes') && col('Día'))) {
    throw new AppError('Se requiere la columna "Fecha" o las columnas "Año", "Mes" y "Día".', 400);
  }

  const categorias = await prisma.categoria.findMany({ include: { subcategorias: { include: { detalles: true } } } });
  const catMap = new Map(categorias.map((c) => [norm(c.codigo), c]));
  const medios = await prisma.medioPago.findMany();
  const medioMap = new Map(medios.map((m) => [norm(m.nombre), m]));

  const errores = [], advertencias = [], validas = [];
  const nuevasSubcategorias = new Map(), nuevosDetalles = new Map(), nuevosMedios = new Map();

  ws.eachRow((row, n) => {
    if (n === 1) return;
    const get = (nombre) => (col(nombre) ? valorCelda(row.getCell(col(nombre))) : null);
    const catTxt = get('Categoría'), subTxt = get('Subcategoría'), montoRaw = get('Monto S/');
    if (!catTxt && !subTxt && (montoRaw === null || montoRaw === undefined || montoRaw === '')) return;

    // --- Fecha ---
    const anio = parseInt(get('Año'), 10);
    const mesIdx = MES_IDX[norm(get('Mes'))];
    const dia = parseInt(get('Día'), 10);
    let fecha = null;
    const fv = get('Fecha');
    if (fv instanceof Date) {
      fecha = new Date(Date.UTC(fv.getUTCFullYear(), fv.getUTCMonth(), fv.getUTCDate()));
    } else if (typeof fv === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.test(fv.trim())) {
      const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})/.exec(fv.trim());
      fecha = new Date(Date.UTC(+y, +m - 1, +d));
    } else if (typeof fv === 'string' && /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.test(fv.trim())) {
      const [, d, m, y] = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(fv.trim());
      fecha = new Date(Date.UTC(+y, +m - 1, +d));
    } else if (typeof fv === 'string' && /^(\d{1,2})-([a-zA-Z]{3})/.test(fv.trim()) && anio) {
      const [, d, m] = /^(\d{1,2})-([a-zA-Z]{3})/.exec(fv.trim());
      if (MES_IDX[norm(m)] !== undefined) fecha = new Date(Date.UTC(anio, MES_IDX[norm(m)], +d));
    }
    if (!fecha && anio && mesIdx !== undefined && dia) fecha = new Date(Date.UTC(anio, mesIdx, dia));
    if (!fecha || Number.isNaN(fecha.getTime())) {
      errores.push({ fila: n, mensaje: 'Fecha inválida o ausente.' });
      return;
    }

    // --- Taxonomía (acepta código exacto o alias amigable) ---
    const catKey = ALIAS_CATEGORIA[norm(catTxt)] || norm(catTxt);
    const cat = catMap.get(catKey);
    if (!cat) return errores.push({ fila: n, mensaje: `Categoría desconocida: "${catTxt}".` });

    const subTxtClean = String(subTxt ?? '').trim();
    if (!subTxtClean) return errores.push({ fila: n, mensaje: 'Subcategoría vacía.' });

    let sub = cat.subcategorias.find((s) => norm(s.codigo) === norm(subTxtClean)) || null;
    if (!sub) {
      const subKey = `${cat.id}|${norm(subTxtClean)}`;
      if (!nuevasSubcategorias.has(subKey)) {
        nuevasSubcategorias.set(subKey, { categoriaId: cat.id, codigo: subTxtClean });
        advertencias.push({ fila: n, mensaje: `Rubro nuevo "${subTxtClean}" se creará automáticamente en ${cat.codigo}.` });
      }
    }

    const monto = round2(parseMonto(montoRaw));
    if (!Number.isFinite(monto) || monto <= 0) return errores.push({ fila: n, mensaje: `Monto inválido: "${montoRaw}".` });

    const detTxt = String(get('Detalle') ?? '').trim();
    let detalle = null;
    if (detTxt && sub) {
      detalle = sub.detalles.find((d) => norm(d.nombre) === norm(detTxt)) || null;
      if (!detalle) {
        const key = `${sub.id}|${norm(detTxt)}`;
        if (!nuevosDetalles.has(key)) {
          nuevosDetalles.set(key, { subcategoriaId: sub.id, nombre: detTxt });
          advertencias.push({ fila: n, mensaje: `Concepto nuevo "${detTxt}" se creará en ${sub.codigo}.` });
        }
      }
    }

    const medTxt = String(get('Medio de pago') ?? '').trim();
    let medio = null;
    if (medTxt) {
      medio = medioMap.get(norm(medTxt)) || null;
      if (!medio && !nuevosMedios.has(norm(medTxt))) {
        nuevosMedios.set(norm(medTxt), medTxt.toUpperCase());
        advertencias.push({ fila: n, mensaje: `Medio de pago nuevo "${medTxt}" se creará.` });
      }
    }

    validas.push({
      fila: n,
      fecha,
      cat,
      sub,
      subTxt: subTxtClean,
      detalle,
      detTxt,
      medio,
      medTxt,
      monto,
      observaciones: String(get('Observaciones') ?? '').trim().slice(0, 500) || null
    });
  });

  // Duplicados exactos ya existentes en BD
  let duplicadas = 0;
  if (validas.length) {
    const fechas = validas.map((v) => v.fecha.getTime());
    const existentes = await prisma.transaccion.findMany({
      where: { fecha: { gte: new Date(Math.min(...fechas)), lte: new Date(Math.max(...fechas)) } },
      select: { fecha: true, subcategoriaId: true, monto: true, detalleNombre: true, observaciones: true }
    });
    const firma = (f, s, m, d, o) => `${f.getTime()}|${s}|${Number(m).toFixed(2)}|${norm(d)}|${norm(o)}`;
    const set = new Set(existentes.map((e) => firma(e.fecha, e.subcategoriaId, e.monto, e.detalleNombre, e.observaciones)));
    for (const v of validas) {
      v.duplicada = v.sub ? set.has(firma(v.fecha, v.sub.id, v.monto, v.detalle?.nombre || v.detTxt, v.observaciones)) : false;
      if (v.duplicada) duplicadas++;
    }
  }
  const aInsertar = validas.filter((v) => !v.duplicada);

  const resumen = {
    filasLeidas: validas.length + errores.length,
    validas: validas.length,
    aImportar: aInsertar.length,
    duplicadas,
    errores: errores.length,
    advertencias: advertencias.length,
    nuevosDetalles: nuevosDetalles.size,
    nuevosMedios: nuevosMedios.size,
    montoTotal: round2(aInsertar.reduce((s, v) => s + v.monto, 0))
  };

  if (!confirmar) {
    return res.json({
      confirmado: false,
      resumen,
      errores: errores.slice(0, 200),
      advertencias: advertencias.slice(0, 200),
      muestra: aInsertar.slice(0, 15).map((v) => ({
        fila: v.fila,
        fecha: formatFecha(v.fecha),
        categoria: v.cat.codigo,
        subcategoria: v.sub?.codigo || v.subTxt,
        detalle: v.detalle?.nombre || v.detTxt || null,
        monto: v.monto,
        medioPago: v.medio?.nombre || v.medTxt || null
      }))
    });
  }

  await prisma.$transaction(async (tx) => {
    const subCreada = new Map();
    for (const [key, s] of nuevasSubcategorias) {
      const creada = await tx.subcategoria.upsert({
        where: { categoriaId_codigo: { categoriaId: s.categoriaId, codigo: s.codigo } },
        update: { activa: true },
        create: { ...s, orden: 999 }
      });
      subCreada.set(key, creada);
    }

    const detCreado = new Map();
    for (const [key, d] of nuevosDetalles) {
      const nuevo = await tx.detalle.create({ data: { ...d, orden: 999 } });
      detCreado.set(key, nuevo);
    }

    const medCreado = new Map();
    for (const [key, nombre] of nuevosMedios) {
      const nuevo = await tx.medioPago.upsert({ where: { nombre }, update: { activo: true }, create: { nombre, orden: 999 } });
      medCreado.set(key, nuevo);
    }

    const data = aInsertar.map((v) => {
      const subObj = v.sub || subCreada.get(`${v.cat.id}|${norm(v.subTxt)}`);
      const det = v.detalle || (v.detTxt && v.sub ? detCreado.get(`${v.sub.id}|${norm(v.detTxt)}`) : null);
      const med = v.medio || (v.medTxt ? medCreado.get(norm(v.medTxt)) : null);
      return {
        fecha: v.fecha,
        tipo: v.cat.tipo,
        categoriaId: v.cat.id,
        subcategoriaId: subObj.id,
        detalleId: det?.id || null,
        medioPagoId: med?.id || null,
        monto: v.monto,
        persona: subObj.persona || v.cat.persona,
        observaciones: v.observaciones,
        categoriaNombre: v.cat.codigo,
        subcategoriaNombre: subObj.codigo,
        detalleNombre: det?.nombre || v.detTxt || null,
        medioPagoNombre: med?.nombre || null,
        creadoPorId: req.user.id
      };
    });
    for (let i = 0; i < data.length; i += 1000) {
      await tx.transaccion.createMany({ data: data.slice(i, i + 1000) });
    }
  }, { timeout: 120000 });

  res.json({ confirmado: true, resumen, errores: errores.slice(0, 200), advertencias: advertencias.slice(0, 200) });
});

export default router;
