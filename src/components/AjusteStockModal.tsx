import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { FormActions, Modal } from './Modal';
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
  const [intentoEnvio, setIntentoEnvio] = useState(false);

  const cant = Number(cantidad);
  const esEnteroPositivo = Number.isInteger(cant) && cant > 0;
  const dejaStockNegativo = tipo === 'salida' && esEnteroPositivo && cant > articulo.stock;
  const valido = esEnteroPositivo && !dejaStockNegativo;
  const delta = tipo === 'entrada' ? cant : -cant;
  const cantidadError =
    (intentoEnvio || cantidad !== '') && !esEnteroPositivo
      ? 'La cantidad debe ser un número entero mayor a 0'
      : dejaStockNegativo
        ? `La salida no puede superar el stock actual (${articulo.stock})`
        : undefined;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIntentoEnvio(true);
    if (!valido) return;
    await ajustar.mutateAsync({ id: articulo.id, delta, motivo: motivo.trim() || undefined });
    onClose();
  };

  const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement) || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Ajustar stock · ${articulo.nombre}`}
      size="sm"
      preventClose={ajustar.isPending}
      footer={(
        <FormActions>
          <button type="button" className={btnGhost} onClick={onClose} disabled={ajustar.isPending}>
            Cancelar
          </button>
          <button type="submit" form="ajuste-stock-form" className={btnPrimary} disabled={ajustar.isPending}>
            {ajustar.isPending ? 'Guardando…' : 'Aplicar ajuste'}
          </button>
        </FormActions>
      )}
    >
      <form id="ajuste-stock-form" onSubmit={onSubmit} onKeyDown={onFormKeyDown} noValidate className="space-y-4">
        <div className="text-[13px] text-text-2">
          Stock actual: <span className="font-mono font-bold text-text">{articulo.stock}</span>
        </div>

        <div className="flex rounded-lg bg-surface-3 p-1" role="group" aria-label="Tipo de ajuste">
          {(['entrada', 'salida'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipo(t);
                setIntentoEnvio(false);
              }}
              aria-pressed={tipo === t}
              className={`min-h-11 flex-1 touch-manipulation rounded-md px-3 py-2 text-[13px] font-bold capitalize transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] sm:min-h-0 ${
                tipo === t ? 'bg-surface text-text shadow-sm' : 'text-text-2'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <FormField label="Cantidad" error={cantidadError} htmlFor="cantidad">
          <input
            id="cantidad"
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value);
              setIntentoEnvio(false);
            }}
            className={inputClass(!!cantidadError)}
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

      </form>
    </Modal>
  );
};
