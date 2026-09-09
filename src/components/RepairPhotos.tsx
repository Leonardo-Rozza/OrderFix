import { useEffect, useRef, useState } from 'react';
import { deletePrivatePhoto, getPrivatePhoto, listPrivatePhotos, type PrivatePhoto } from '../api/repairPhotos';
import { authStore } from '../store/auth.store';
import { BlobImage } from './BlobImage';
import { btnGhost, card } from './ui';

/** Sólo existe mientras una foto está abierta: desmontar aborta la lectura y libera el Blob. */
const PhotoContent = ({ repairId, photo }: { repairId: number; photo: PrivatePhoto }) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const reading = new AbortController();
    void getPrivatePhoto(repairId, photo.id, reading.signal).then((data) => {
      if (!reading.signal.aborted) setBlob(data);
    }).catch(() => { if (!reading.signal.aborted) setError(true); });
    return () => reading.abort();
  }, [repairId, photo.id, reload]);
  return <>
    {blob && <BlobImage blob={blob} alt={photo.momento === 'INGRESO' ? 'Foto privada del ingreso' : 'Foto privada post-reparación'}
      className="max-h-96 w-full rounded-lg object-contain" />}
    {!blob && !error && <p role="status">Cargando foto privada…</p>}
    {error && <>
      <p role="alert" className="text-sm text-danger">No pudimos leer esta foto privada.</p>
      <button type="button" className={btnGhost} onClick={() => { setError(false); setReload((value) => value + 1); }}>Reintentar lectura</button>
    </>}
  </>;
};

const Photo = ({ repairId, photo, open, onToggle, onDeleted }: {
  repairId: number; photo: PrivatePhoto; open: boolean; onToggle: () => void; onDeleted: () => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const currentDelete = useRef<AbortController | null>(null);
  useEffect(() => () => currentDelete.current?.abort(), []);
  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    const request = new AbortController();
    currentDelete.current = request;
    try {
      await deletePrivatePhoto(repairId, photo.id, request.signal);
      if (!request.signal.aborted) onDeleted();
    } catch {
      if (!request.signal.aborted) setError('No se confirmó el borrado. La foto permanece en la lista; podés reintentar eliminarla.');
    } finally {
      if (!request.signal.aborted) setDeleting(false);
    }
  };
  return <article className="min-w-0 space-y-2 rounded-lg border border-border p-3">
    <p className="text-sm font-semibold">{photo.momento === 'INGRESO' ? 'Foto del ingreso' : 'Foto post-reparación'}</p>
    <button type="button" className={btnGhost} onClick={onToggle}>{open ? 'Cerrar foto' : 'Ver foto'}</button>
    {open && <PhotoContent repairId={repairId} photo={photo} />}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {confirmDelete ? <div className="space-y-2">
      <p className="text-sm">¿Eliminar definitivamente esta foto privada?</p>
      <button type="button" className={btnGhost} disabled={deleting} onClick={() => void remove()}>{deleting ? 'Eliminando…' : 'Confirmar eliminación'}</button>
      <button type="button" className={btnGhost} disabled={deleting} onClick={() => setConfirmDelete(false)}>Conservar foto</button>
    </div> : <button type="button" className={btnGhost} onClick={() => setConfirmDelete(true)}>Eliminar foto</button>}
  </article>;
};

export const RepairPhotos = ({ repairId }: { repairId: number }) => {
  const token = authStore((state) => state.token);
  // Cambiar reparación o sesión destruye todo el estado privado antes de renderizar la nueva galería.
  return <RepairPhotosSession key={`${repairId}:${token ?? ''}`} repairId={repairId} />;
};

const RepairPhotosSession = ({ repairId }: { repairId: number }) => {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<PrivatePhoto[] | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!open) return;
    const request = new AbortController();
    void listPrivatePhotos(repairId, request.signal).then((data) => {
      if (!request.signal.aborted) setPhotos(data);
    }).catch(() => { if (!request.signal.aborted) setError(true); });
    return () => request.abort();
  }, [repairId, open, reload]);
  return <section aria-label="Fotos privadas" className={`${card} min-w-0 space-y-3 p-5`}>
    <h2 className="font-extrabold">Fotos privadas</h2>
    <p className="text-sm text-text-3">Acceso exclusivo del taller. Para agregar fotos, editá la reparación.</p>
    <button type="button" className={btnGhost} onClick={() => {
      setPhotos(null); setOpenedId(null); setError(false); setOpen(true); setReload((value) => value + 1);
    }}>Ver fotos privadas</button>
    {open && !photos && !error && <p role="status">Cargando fotos privadas…</p>}
    {error && <p role="alert">La lectura privada no está disponible. Podés reintentar desde Ver fotos privadas.</p>}
    {photos?.length === 0 && <p>No hay fotos privadas guardadas.</p>}
    {photos?.map((photo) => <Photo key={photo.id} repairId={repairId} photo={photo} open={openedId === photo.id}
      onToggle={() => setOpenedId((current) => current === photo.id ? null : photo.id)}
      onDeleted={() => {
        if (openedId === photo.id) setOpenedId(null);
        setPhotos((current) => current?.filter((item) => item.id !== photo.id) ?? []);
      }} />)}
  </section>;
};
