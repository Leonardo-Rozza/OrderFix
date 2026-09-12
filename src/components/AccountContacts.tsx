import { Link } from 'react-router';
import {
  readLegalContactConfig,
  validateLegalContactConfig,
  type LegalContactEnvironment,
} from '../config/legalContact';

interface AccountContactsProps {
  isAdmin: boolean;
  tallerTelefono: string | null;
}

const contactFields = [
  { variable: 'VITE_PRIVACY_EMAIL', property: 'privacyEmail', label: 'Privacidad y datos' },
  { variable: 'VITE_LEGAL_EMAIL', property: 'legalEmail', label: 'Consultas legales' },
  { variable: 'VITE_SUPPORT_EMAIL', property: 'supportEmail', label: 'Soporte' },
] as const;

/** Codifica el destinatario para que ?/#/% en un email válido no agreguen cabeceras. */
const emailHref = (email: string) => `mailto:${encodeURIComponent(email)}`;

export const AccountContacts = ({ isAdmin, tallerTelefono }: AccountContactsProps) => {
  const environment: LegalContactEnvironment = {
    VITE_PRIVACY_EMAIL: import.meta.env.VITE_PRIVACY_EMAIL,
    VITE_LEGAL_EMAIL: import.meta.env.VITE_LEGAL_EMAIL,
    VITE_SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL,
  };
  const contacts = readLegalContactConfig(environment);
  const issues = validateLegalContactConfig(environment, true);
  const privacyAvailable = !issues.some((issue) => issue.variable === 'VITE_PRIVACY_EMAIL');

  return (
    <section aria-labelledby="account-privacy-title" className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <h2 id="account-privacy-title" className="text-[16px] font-extrabold">Privacidad, datos y baja</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">
        Las solicitudes sobre tus datos personales todavía no se gestionan desde la app.
      </p>
      {isAdmin ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">
          El cierre del taller todavía no está disponible en esta pantalla.
          {privacyAvailable && ' Podés consultar por tus datos o la baja escribiendo al contacto de privacidad.'}
        </p>
      ) : (
        <div className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-text-2">
          <p>
            Podés dar de baja tu propio acceso desde Cuenta. Esto no cierra el taller ni elimina tus datos personales.
          </p>
          <Link to="/cuenta/baja-acceso" className="inline-flex min-h-11 items-center rounded-md font-bold text-primary underline focus-visible:outline focus-visible:outline-primary">Dar de baja mi acceso</Link>
          <p>Para otras consultas, contactá al titular del taller{privacyAvailable ? ' o al contacto de privacidad' : ''}.</p>
          {tallerTelefono?.trim() && (
            <p className="[overflow-wrap:anywhere]">Teléfono del taller: {tallerTelefono}</p>
          )}
        </div>
      )}

      <dl className="mt-4 divide-y divide-border">
        {contactFields.map(({ variable, property, label }) => {
          const available = !issues.some((issue) => issue.variable === variable);
          return (
            <div key={variable} className="py-3 first:pt-0 last:pb-0">
              <dt className="text-[12.5px] font-bold text-text-2">{label}</dt>
              <dd className="mt-1 min-w-0 text-[13.5px]">
                {available ? (
                  <a
                    href={emailHref(contacts[property])}
                    className="inline-flex min-h-11 max-w-full items-center rounded-md py-2 font-bold text-primary underline decoration-primary/40 underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]"
                    aria-label={`Escribir a ${label.toLowerCase()}: ${contacts[property]}`}
                  >
                    {contacts[property]}
                  </a>
                ) : (
                  <span className="text-text-3">Contacto todavía no disponible.</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {issues.length < contactFields.length && (
        <p className="mt-4 text-[12.5px] leading-relaxed text-text-3">
          Los enlaces abren tu aplicación de correo. No envían mensajes ni registran solicitudes automáticamente.
        </p>
      )}
    </section>
  );
};
