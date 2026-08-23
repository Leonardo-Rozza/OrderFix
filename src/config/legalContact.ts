export const LEGAL_PLACEHOLDERS = [
  '[RAZÓN SOCIAL]',
  '[CUIT]',
  '[DOMICILIO]',
  '[EMAIL LEGAL]',
  '[EMAIL PRIVACIDAD]',
  '[JURISDICCIÓN]',
  '[HORARIO DE ATENCIÓN]',
] as const;

export interface LegalContactEnvironment {
  VITE_LEGAL_EMAIL?: string;
  VITE_PRIVACY_EMAIL?: string;
  VITE_SUPPORT_EMAIL?: string;
}

export interface LegalContactConfig {
  legalEmail: string;
  privacyEmail: string;
  supportEmail: string;
}

export interface LegalContactIssue {
  code: 'CONTACT_MISSING' | 'CONTACT_INVALID';
  variable: keyof LegalContactEnvironment;
}

const PUBLIC_CONTACT_KEYS = [
  ['VITE_LEGAL_EMAIL', 'legalEmail'],
  ['VITE_PRIVACY_EMAIL', 'privacyEmail'],
  ['VITE_SUPPORT_EMAIL', 'supportEmail'],
] as const;

const isNonPublicHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  const labels = normalized.split('.');
  const isIpLiteral = normalized.includes(':') || /^\d+(?:\.\d+){3}$/.test(normalized);
  const hasValidDnsLabels =
    normalized.length <= 253 &&
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    ) &&
    !/^\d+$/.test(labels.at(-1) ?? '');
  const reservedSuffixes = [
    '.localhost',
    '.local',
    '.internal',
    '.invalid',
    '.test',
    '.example',
    '.home.arpa',
    '.arpa',
    '.onion',
    '.alt',
    '.lan',
    '.home',
    '.corp',
    '.localdomain',
  ];
  return (
    isIpLiteral ||
    !hasValidDnsLabels ||
    normalized === 'localhost' ||
    reservedSuffixes.some((suffix) => normalized.endsWith(suffix)) ||
    ['example.com', 'example.org', 'example.net'].some(
      (domain) => normalized === domain || normalized.endsWith(`.${domain}`)
    )
  );
};

const isPublicEmail = (value: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const separator = value.lastIndexOf('@');
  const localPart = value.slice(0, separator);
  const domain = value.slice(separator + 1).toLowerCase();
  const validLocalPart =
    localPart.length <= 64 &&
    !localPart.startsWith('.') &&
    !localPart.endsWith('.') &&
    !localPart.includes('..') &&
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart);
  return validLocalPart && !isNonPublicHostname(domain);
};

export const readLegalContactConfig = (
  environment: LegalContactEnvironment
): LegalContactConfig => ({
  legalEmail: environment.VITE_LEGAL_EMAIL?.trim() ?? '',
  privacyEmail: environment.VITE_PRIVACY_EMAIL?.trim() ?? '',
  supportEmail: environment.VITE_SUPPORT_EMAIL?.trim() ?? '',
});

export const validateLegalContactConfig = (
  environment: LegalContactEnvironment,
  publicRelease: boolean
): LegalContactIssue[] => {
  if (!publicRelease) return [];

  const config = readLegalContactConfig(environment);
  const issues: LegalContactIssue[] = [];
  for (const [variable, property] of PUBLIC_CONTACT_KEYS) {
    const value = config[property];
    if (!value) issues.push({ code: 'CONTACT_MISSING', variable });
    else if (!isPublicEmail(value)) issues.push({ code: 'CONTACT_INVALID', variable });
  }
  return issues;
};
