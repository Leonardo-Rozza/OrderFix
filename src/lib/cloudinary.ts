/**
 * Subida de imágenes a Cloudinary con upload preset "unsigned" — se hace
 * directo desde el navegador, sin pasar por nuestro backend (que solo guarda
 * la URL resultante). El cloud name y el preset no son secretos: viajan en el
 * bundle de cualquier app que use unsigned uploads.
 */
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dnd9rnidg';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ordenfix_unsigned';

const MAX_BYTES = 10 * 1024 * 1024; // límite del plan free de Cloudinary por imagen

export class FotoInvalidaError extends Error {}

export const subirFoto = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new FotoInvalidaError(`"${file.name}" no es una imagen.`);
  }
  if (file.size > MAX_BYTES) {
    throw new FotoInvalidaError(`"${file.name}" pesa más de 10 MB.`);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`No se pudo subir "${file.name}".`);
  }
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error(`Cloudinary no devolvió la URL de "${file.name}".`);
  }
  return data.secure_url;
};
