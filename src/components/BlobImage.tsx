import { useEffect, useRef, type ImgHTMLAttributes } from 'react';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  blob: Blob;
}

/**
 * Renderiza un blob sin persistir su URL. El efecto sincroniza el elemento img
 * y revoca cada object URL al cambiar de versión o desmontarse.
 */
export const BlobImage = ({ blob, ...props }: Props) => {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    const image = imageRef.current;
    if (image) image.src = objectUrl;

    return () => {
      if (image?.src === objectUrl) image.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return <img ref={imageRef} {...props} />;
};
