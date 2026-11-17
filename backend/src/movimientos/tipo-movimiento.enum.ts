export enum TipoMovimiento {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

export enum MotivoMovimiento {
  COMPRA = 'compra',
  INVENTARIO_INICIAL = 'inventario_inicial',
  DEVOLUCION_CLIENTE = 'devolucion_cliente',
  VENTA = 'venta',
  MERMA = 'merma',
  DEVOLUCION_PROVEEDOR = 'devolucion_proveedor',
  AJUSTE = 'ajuste',
}

// Qué motivos son válidos para cada tipo de movimiento
export const MOTIVOS_POR_TIPO: Record<TipoMovimiento, MotivoMovimiento[]> = {
  [TipoMovimiento.ENTRADA]: [
    MotivoMovimiento.COMPRA,
    MotivoMovimiento.INVENTARIO_INICIAL,
    MotivoMovimiento.DEVOLUCION_CLIENTE,
    MotivoMovimiento.AJUSTE,
  ],
  [TipoMovimiento.SALIDA]: [
    MotivoMovimiento.VENTA,
    MotivoMovimiento.MERMA,
    MotivoMovimiento.DEVOLUCION_PROVEEDOR,
    MotivoMovimiento.AJUSTE,
  ],
};

// Estos motivos exigen una observación que explique lo ocurrido
export const MOTIVOS_CON_OBSERVACION: MotivoMovimiento[] = [
  MotivoMovimiento.AJUSTE,
  MotivoMovimiento.MERMA,
];