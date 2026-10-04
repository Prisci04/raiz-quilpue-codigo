export function mapActividadVista(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    titulo: row.titulo ?? "",
    descripcion: row.descripcion ?? "",
    fecha: row.fecha ?? null,
    hora_inicio: row.hora_inicio ?? null,
    hora_fin: row.hora_fin ?? null,
    lugar: row.lugar ?? null,
    publico_objetivo: row.publico_objetivo ?? null,
    modalidad: row.modalidad ?? null,
    tipo_participacion: row.tipo_participacion ?? null,
    cupos: row.cupos ?? null,
    tipo_valor: row.tipo_valor ?? null,
    valor_monto: row.valor_monto ?? null,
    forma_pago: row.forma_pago ?? null,
    informacion_adicional: row.informacion_adicional ?? null,
    imagen_url: row.imagen_url ?? null,
  };
}
