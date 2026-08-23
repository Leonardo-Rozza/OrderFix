import { Navigate, useParams } from 'react-router';

/** Redirige el nombre histórico sin montar una segunda página ni otra query. */
export const ReciboCompatRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/reparaciones/${id}/resumen`} replace />;
};
