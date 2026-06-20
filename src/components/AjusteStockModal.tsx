import { useState } from 'react';
import { Modal } from './Modal';
import { FormField } from './FormField';
import { inputClass, btnGhost, btnPrimary } from './ui';
import { useAjustarStockMutation } from '../api/mutations/inventario.mutations';
import type { Articulo } from '../types';

interface Props {
  onClose: () => void;
  articulo: Articulo;
}

/** Se monta solo cuando hay un artículo a ajustar (estado fresco en cada apertura). */
export const AjusteStockModal = ({ onClose, articulo }: Props) => {
  const ajustar = useAjustarStockMutation();
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');

  const cant = Number(cantidad);
  const valido = Number.isFinite(cant) && cant > 0;
  const delta = tipo === 'entrada' ? cant : -cant;

  const onSubmit = async () => {
    if (!valido) return;
    await ajustar.mutateAsync({ id: articulo.id, delta, motivo: motivo.trim() || undefined });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Ajustar stock · ${articulo.nombre}`} size="sm">
      <div className="space-y-4">
        <div className="text-[13px] text-text-2">
          Stock actual: <span className="font-mono font-bold text-text">{articulo.stock}</span>
        </div>

        <div className="flex rounded-lg bg-surface-3 p-1">
          {(['entrada', 'salida'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 rounded-md px-3 py-2 text-[13px] font-bold capitalize transition ${
                tipo === t ? 'bg-surface text-text shadow-sm' : 'text-text-2'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <FormField label="Cantidad" htmlFor="cantidad">
          <input
            id="cantidad"
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className={inputClass()}
            placeholder="0"
          />
        </FormField>

        <FormField label="Motivo" htmlFor="motivo">
          <input
            id="motivo"
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={inputClass()}
            placeholder="Ej: compra, conteo, rotura…"
          />
        </FormField>

        {valido && (
          <div className="text-[13px] text-text-2">
            Nuevo stock: <span className="font-mono font-bold text-text">{articulo.stock + delta}</span>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={btnPrimary} onClick={onSubmit} disabled={!valido || ajustar.isPending}>
            {ajustar.isPending ? 'Guardando…' : 'Aplicar ajuste'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
