type UnsavedChangesReleaseListener = () => void;

let releaseEpoch = 0;
const releaseListeners = new Set<UnsavedChangesReleaseListener>();

/**
 * Identifica la generación global vigente al montar una sesión de formulario.
 * Cada liberación invalida sólo las sesiones que ya estaban activas.
 */
export const getUnsavedChangesReleaseEpoch = () => releaseEpoch;

/** Suscribe una sesión activa a liberaciones globales (logout, sesión revocada). */
export const subscribeUnsavedChangesRelease = (listener: UnsavedChangesReleaseListener) => {
  releaseListeners.add(listener);
  return () => {
    releaseListeners.delete(listener);
  };
};

/**
 * Libera sincrónicamente todos los guards montados sin dejar un bypass pegajoso:
 * los formularios que se monten después capturan la nueva generación.
 */
export const releaseUnsavedChangesGuards = () => {
  releaseEpoch += 1;
  [...releaseListeners].forEach((listener) => listener());
};
