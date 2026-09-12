import { AccountContacts } from '../components/AccountContacts';
import { AccountLegalHistory } from '../components/AccountLegalHistory';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAccountProfile } from '../router/accountProfile';
import { Link } from 'react-router';
import { btnGhost } from '../components/ui';

export const AccountPage = () => {
  const { usuario, taller } = useAccountProfile();
  const isAdmin = usuario.role === 'ADMIN';

  return (
    <DashboardLayout accountMode title="Cuenta">
      <div className="ofx-in mx-auto max-w-[900px] space-y-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Tu cuenta</h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-text-2">
            Consultá tu identidad, tus aceptaciones y las opciones disponibles para tus datos.
          </p>
        </div>

        <section aria-labelledby="account-identity-title" className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h2 id="account-identity-title" className="text-[16px] font-extrabold">Usuario y taller</h2>
          <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            {[
              ['Nombre', usuario.username],
              ['Email de la cuenta', usuario.email],
              ['Rol', isAdmin ? 'Titular del taller' : 'Empleado'],
              ['Taller', taller.nombre],
              ['Teléfono del taller', taller.telefono?.trim() || 'No informado'],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[12.5px] font-bold text-text-3">{label}</dt>
                <dd className="mt-1 text-[14px] font-semibold [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <AccountLegalHistory />
        {isAdmin && <section aria-labelledby="account-export-title" className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h2 id="account-export-title" className="text-[16px] font-extrabold">Una copia de los datos de tu taller</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">Consultá tus respaldos ZIP o descargá el reporte Excel. Para solicitar o descargar un archivo, confirmá con tu contraseña actual.</p>
          <Link to="/cuenta/exportacion" className={`${btnGhost} mt-3`}>Exportar datos</Link>
        </section>}
        <AccountContacts isAdmin={isAdmin} tallerTelefono={taller.telefono} />
      </div>
    </DashboardLayout>
  );
};
