import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { fromMarkdown } from 'mdast-util-from-markdown';

export const KNOWN_PLACEHOLDERS = Object.freeze([
  '[RAZÓN SOCIAL]',
  '[CUIT]',
  '[DOMICILIO]',
  '[EMAIL LEGAL]',
  '[EMAIL PRIVACIDAD]',
  '[JURISDICCIÓN]',
  '[HORARIO DE ATENCIÓN]',
]);

export const PUBLIC_CONTACT_VARIABLES = Object.freeze([
  'VITE_LEGAL_EMAIL',
  'VITE_PRIVACY_EMAIL',
  'VITE_SUPPORT_EMAIL',
]);

export const LEGAL_MANIFEST_ISSUE_CODES = Object.freeze([
  'PLACEHOLDER_FOUND',
  'EDITORIAL_MARKER_FOUND',
  'DOCUMENT_UTF8_REQUIRED',
  'DOCUMENT_CANONICAL_TEXT_REQUIRED',
  'MANIFEST_SCHEMA_UNAVAILABLE',
  'MANIFEST_SCHEMA_INVALID',
  'MANIFEST_PUBLISHER_INVALID',
  'MANIFEST_CONTACTS_INVALID',
  'PROFESSIONAL_REVIEW_REQUIRED',
  'MANIFEST_DOCUMENTS_INVALID',
  'MANIFEST_DOCUMENT_INVALID',
  'MANIFEST_DUPLICATE_DOCUMENT',
  'MANIFEST_DUPLICATE_DOCUMENT_TYPE',
  'MANIFEST_DUPLICATE_DOCUMENT_SOURCE',
  'DOCUMENT_PATH_INVALID',
  'DOCUMENT_NOT_FOUND',
  'UNSAFE_MARKDOWN_FOUND',
  'MANIFEST_DIGEST_MISMATCH',
  'REQUIRED_DOCUMENT_MISSING',
  'MANIFEST_REQUIREMENTS_INVALID',
  'MANIFEST_REQUIREMENT_INVALID',
  'MANIFEST_DUPLICATE_REQUIREMENT',
  'REQUIREMENT_CANONICAL_TEXT_REQUIRED',
  'REQUIREMENT_DIGEST_MISMATCH',
  'REQUIREMENT_DOCUMENT_UNKNOWN',
  'REQUIREMENT_CONTEXT_MISMATCH',
  'REQUIRED_REQUIREMENT_MISSING',
  'REQUIRED_REQUIREMENT_DOCUMENT_MISSING',
  'REQUIRED_DOCUMENT_UNBOUND',
  'MANIFEST_NOT_CONFIGURED',
  'MANIFEST_PATH_INVALID',
  'MANIFEST_NOT_FOUND',
  'MANIFEST_JSON_INVALID',
  'MANIFEST_HEADER_INVALID',
  'MANIFEST_PUBLICATION_ID_MISMATCH',
]);

const REQUIRED_DOCUMENT_TYPES = Object.freeze([
  'TERMINOS_SERVICIO',
  'POLITICA_PRIVACIDAD',
  'ACUERDO_TRATAMIENTO_DATOS',
  'CONDICIONES_PRO',
  'POLITICA_CANCELACIONES_REEMBOLSOS',
  'POLITICA_CIERRE_CUENTA',
  'AVISO_CLIENTES_TALLER',
  'TERMINOS_USUARIO',
  'AVISO_PRIVACIDAD_USUARIO',
  'COMPROMISO_CONFIDENCIALIDAD',
  'ATESTACION_DATOS_CLIENTE',
]);

const DOCUMENT_TYPES = new Set(REQUIRED_DOCUMENT_TYPES);
const LEGAL_CONTEXTS = new Set([
  'REGISTRO',
  'PRIMER_INGRESO_EMPLEADO',
  'USO_CONTINUADO',
  'CONTRATACION_PRO',
  'ATESTACION_FOTOS',
  'ATESTACION_CREDENCIALES',
  'CIERRE_CUENTA',
  'ARREPENTIMIENTO',
]);
const LEGAL_ROLES = new Set(['ADMIN_TITULAR', 'USER']);
const REQUIRED_REQUIREMENTS = Object.freeze([
  {
    context: 'REGISTRO',
    roles: ['ADMIN_TITULAR'],
    documentTypes: [
      'TERMINOS_SERVICIO',
      'POLITICA_PRIVACIDAD',
      'ACUERDO_TRATAMIENTO_DATOS',
    ],
  },
  {
    context: 'PRIMER_INGRESO_EMPLEADO',
    roles: ['USER'],
    documentTypes: [
      'TERMINOS_USUARIO',
      'AVISO_PRIVACIDAD_USUARIO',
      'COMPROMISO_CONFIDENCIALIDAD',
    ],
  },
  {
    context: 'CONTRATACION_PRO',
    roles: ['ADMIN_TITULAR'],
    documentTypes: [
      'TERMINOS_SERVICIO',
      'CONDICIONES_PRO',
      'POLITICA_CANCELACIONES_REEMBOLSOS',
    ],
  },
  {
    context: 'ATESTACION_FOTOS',
    roles: ['ADMIN_TITULAR', 'USER'],
    documentTypes: ['AVISO_CLIENTES_TALLER', 'ATESTACION_DATOS_CLIENTE'],
  },
  {
    context: 'ATESTACION_CREDENCIALES',
    roles: ['ADMIN_TITULAR', 'USER'],
    documentTypes: ['AVISO_CLIENTES_TALLER', 'ATESTACION_DATOS_CLIENTE'],
  },
  {
    context: 'CIERRE_CUENTA',
    roles: ['ADMIN_TITULAR'],
    documentTypes: ['POLITICA_CIERRE_CUENTA'],
  },
]);

const API_VARIABLES = ['VITE_API_BASE_URL', 'VITE_API_URL'];
const SAFE_IDENTIFIER = /^[a-z0-9][a-z0-9._-]{2,127}$/i;
const SAFE_SOURCE_PATH = /^(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.md$/i;
const SAFE_OUTPUT_TARGET = /^[a-z0-9_./,:#-]+$/i;
const VERSION = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const PLAN_AMOUNT_ASSIGNMENT =
  /(?:\b(?:precio|price|amount|monto|fee|tarifa|cost|costo|valor|rate|charge|importe|cobro)\b|\b(?:monthly|mensual|subscription|suscripcion)(?:_?(?:price|precio|amount|monto|fee|cost|costo|value|valor|rate|tarifa|charge|importe|cobro))?\b|(?:PRO|PLAN|VITE)[_A-Z0-9]*(?:PRICE|PRECIO|AMOUNT|MONTO|RATE|TARIFA|CHARGE|IMPORTE|COBRO))\s*[:=]\s*['"`]?\d[\d._]*/i;
const PLAN_SPECIFIC_AMOUNT_ASSIGNMENT =
  /(?:\b(?:monthly|mensual|subscription|suscripcion)(?:_?(?:price|precio|amount|monto|fee|cost|costo|value|valor|rate|tarifa|charge|importe|cobro))?\b|(?:PRO|PLAN|VITE)[_A-Z0-9]*(?:PRICE|PRECIO|AMOUNT|MONTO|RATE|TARIFA|CHARGE|IMPORTE|COBRO))\s*[:=]\s*['"`]?\d[\d._]*/i;
const TEXTUAL_ARTIFACT_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.svg',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
  '.webmanifest',
  '.map',
]);
const RUNTIME_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.svg',
  '.html',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const issue = (code, target) => ({ code, target });

const safeOutputTarget = (candidate, fallback) =>
  typeof candidate === 'string' && SAFE_OUTPUT_TARGET.test(candidate) ? candidate : fallback;

const normalizeText = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\p{M}\p{Cf}]/gu, '')
    .replace(/[\p{White_Space}\p{Z}]+/gu, ' ')
    .toUpperCase();

const normalizeTextPreservingLines = (value) => {
  const compatibility = value.normalize('NFKD');
  let normalized = '';
  let previousHorizontalWhitespace = false;
  for (const character of compatibility) {
    if (/[\p{M}\p{Cf}]/u.test(character)) continue;
    if (character === '\r' || character === '\n') {
      normalized += character;
      previousHorizontalWhitespace = false;
    } else if (/[\p{White_Space}\p{Z}]/u.test(character)) {
      if (!previousHorizontalWhitespace) normalized += ' ';
      previousHorizontalWhitespace = true;
    } else {
      normalized += character;
      previousHorizontalWhitespace = false;
    }
  }
  return normalized.toUpperCase();
};

const isJavaStripWhitespace = (codePoint) =>
  (codePoint >= 0x0009 && codePoint <= 0x000d) ||
  (codePoint >= 0x001c && codePoint <= 0x0020) ||
  codePoint === 0x1680 ||
  (codePoint >= 0x2000 && codePoint <= 0x2006) ||
  (codePoint >= 0x2008 && codePoint <= 0x200a) ||
  codePoint === 0x2028 ||
  codePoint === 0x2029 ||
  codePoint === 0x205f ||
  codePoint === 0x3000;

const stripUnicodeWhitespace = (value) => {
  const characters = [...value];
  let start = 0;
  let end = characters.length;
  while (start < end && isJavaStripWhitespace(characters[start].codePointAt(0))) start += 1;
  while (end > start && isJavaStripWhitespace(characters[end - 1].codePointAt(0))) end -= 1;
  return characters.slice(start, end).join('');
};

const isPublishableText = (value) =>
  typeof value === 'string' &&
  !/\p{Cc}/u.test(value) &&
  /[^\p{White_Space}\p{Z}\p{Cf}\p{M}\p{Cc}]/u.test(value);

const visitMarkdown = (node, visitor) => {
  visitor(node);
  for (const child of node.children ?? []) visitMarkdown(child, visitor);
};

const markdownVisibleText = (
  node,
  includeLinkLabels = true,
  softBreaksAsSpaces = false
) => {
  if (
    !includeLinkLabels &&
    ['link', 'linkReference', 'image', 'imageReference'].includes(node.type)
  ) {
    return '';
  }
  if (node.type === 'text') {
    return softBreaksAsSpaces ? (node.value ?? '').replace(/\n/g, ' ') : (node.value ?? '');
  }
  if (node.type === 'inlineCode' || node.type === 'code') {
    return node.value ?? '';
  }
  if (node.type === 'break') return '\n';
  if (node.type === 'image') return node.alt ?? '';

  const visible = (node.children ?? [])
    .map((child) => markdownVisibleText(child, includeLinkLabels, softBreaksAsSpaces))
    .join('');
  return ['root', 'paragraph', 'heading', 'blockquote', 'list', 'listItem'].includes(node.type)
    ? `${visible}\n`
    : visible;
};

const findMarkdownLabelEnd = (content, opening, limit) => {
  let depth = 0;
  let escaped = false;
  for (let index = opening + 1; index < limit; index += 1) {
    const character = content[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '[') {
      depth += 1;
    } else if (character === ']' && depth === 0) {
      return index;
    } else if (character === ']') {
      depth -= 1;
    }
  }
  return -1;
};

const isInside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const hasSymlinkComponent = async (parent, child) => {
  if (!isInside(parent, child)) return true;
  const relative = path.relative(parent, child);
  if (!relative) return (await lstat(parent)).isSymbolicLink();

  let current = parent;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    if ((await lstat(current)).isSymbolicLink()) return true;
  }
  return false;
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const hasOnlyProperties = (value, allowed) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).every((property) => allowed.includes(property));

const validDate = (value) =>
  nonEmptyString(value) && ISO_WITH_ZONE.test(value) && !Number.isNaN(Date.parse(value));

const isPrivateIpv4 = (hostname) => {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;
  const [first = -1, second = -1] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
};

const isNonPublicHostname = (hostname) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/, '');
  const isIpv6 = normalized.includes(':');
  const isIpLiteral = isIpv6 || /^\d+(?:\.\d+){3}$/.test(normalized);
  const labels = normalized.split('.');
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
  return (
    isIpLiteral ||
    !hasValidDnsLabels ||
    normalized === 'localhost' ||
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('::ffff:') ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.invalid') ||
    normalized.endsWith('.test') ||
    normalized.endsWith('.example') ||
    normalized.endsWith('.home.arpa') ||
    normalized.endsWith('.arpa') ||
    normalized.endsWith('.onion') ||
    normalized.endsWith('.alt') ||
    normalized.endsWith('.lan') ||
    normalized.endsWith('.home') ||
    normalized.endsWith('.corp') ||
    normalized.endsWith('.localdomain') ||
    ['example.com', 'example.org', 'example.net'].some(
      (domain) => normalized === domain || normalized.endsWith(`.${domain}`)
    ) ||
    (isIpv6 && normalized.startsWith('fc')) ||
    (isIpv6 && normalized.startsWith('fd')) ||
    (isIpv6 && normalized.startsWith('fe8')) ||
    (isIpv6 && normalized.startsWith('fe9')) ||
    (isIpv6 && normalized.startsWith('fea')) ||
    (isIpv6 && normalized.startsWith('feb')) ||
    isPrivateIpv4(normalized)
  );
};

const parsePublicUrl = (rawValue) => {
  let url;
  try {
    url = new URL(rawValue);
  } catch {
    return { error: 'API_URL_INVALID' };
  }

  if (url.username || url.password || url.search || url.hash) {
    return { error: 'API_URL_INVALID' };
  }
  if (url.protocol !== 'https:') return { error: 'API_URL_HTTPS_REQUIRED' };
  if (isNonPublicHostname(url.hostname)) return { error: 'API_URL_PUBLIC_HOST_REQUIRED' };

  const normalized = new URL(url);
  normalized.hostname = normalized.hostname.replace(/\.+$/, '');
  normalized.pathname = normalized.pathname.replace(/\/api\/?$/, '').replace(/\/+$/, '') || '/';
  return { normalized: normalized.toString() };
};

const isForbiddenPublicEmailCodePoint = (codePoint) =>
  codePoint <= 0x001f ||
  (codePoint >= 0x007f && codePoint <= 0x009f) ||
  codePoint === 0x00a0 ||
  codePoint === 0x1680 ||
  (codePoint >= 0x2000 && codePoint <= 0x200a) ||
  codePoint === 0x2028 ||
  codePoint === 0x2029 ||
  codePoint === 0x202f ||
  codePoint === 0x205f ||
  codePoint === 0x3000 ||
  codePoint === 0xfeff;

const isPublicEmail = (rawValue) => {
  const raw = rawValue ?? '';
  const value = raw.trim();
  if (
    !EMAIL.test(value) ||
    [...raw].some((character) =>
      isForbiddenPublicEmailCodePoint(character.codePointAt(0))
    )
  ) {
    return false;
  }
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

export const getReleaseCheckLevel = (mode, environment) => {
  if (mode === 'public') return 'public';
  if (mode === 'runtime') return 'runtime';
  if (mode === 'development') return 'skip';
  if (
    environment.VERCEL_ENV === 'production' ||
    environment.ORDENFIX_PUBLIC_RELEASE === 'true'
  ) {
    return 'public';
  }
  if (environment.VERCEL_ENV === 'preview' || environment.CI === 'true') return 'runtime';
  return 'skip';
};

export const shouldRunPublicReleaseCheck = (mode, environment) =>
  getReleaseCheckLevel(mode, environment) !== 'skip';

export const validatePublicApiEnvironment = (environment) => {
  const issues = [];
  const configuredApiVariables = API_VARIABLES.filter((key) => environment[key]?.trim());

  if (configuredApiVariables.length === 0) {
    issues.push(issue('API_URL_MISSING', 'VITE_API_BASE_URL'));
  } else {
    const parsed = configuredApiVariables.map((key) => [key, parsePublicUrl(environment[key].trim())]);
    for (const [key, result] of parsed) {
      if (result.error) issues.push(issue(result.error, key));
    }

    if (
      parsed.length === 2 &&
      parsed.every(([, result]) => result.normalized) &&
      parsed[0][1].normalized !== parsed[1][1].normalized
    ) {
      issues.push(issue('API_URL_CONFLICT', 'VITE_API_BASE_URL,VITE_API_URL'));
    }
  }

  return issues;
};

export const validatePublicEnvironment = (environment) => {
  const issues = validatePublicApiEnvironment(environment);
  // E remains a local capability until retention, provider receipts and recovery are accredited.
  if (environment.VITE_WORKSHOP_CLOSURE_ENABLED === 'true') {
    issues.push(issue('WORKSHOP_CLOSURE_NOT_RELEASED', 'VITE_WORKSHOP_CLOSURE_ENABLED'));
  }

  for (const variable of PUBLIC_CONTACT_VARIABLES) {
    const value = environment[variable]?.trim();
    if (!value) issues.push(issue('CONTACT_MISSING', variable));
    else if (!isPublicEmail(value)) issues.push(issue('CONTACT_INVALID', variable));
  }

  return issues;
};

export const findPlaceholderIssues = (content, target) => {
  const issues = [];
  const markdown = fromMarkdown(content);
  const normalized = normalizeText(content);
  const visibleText = markdownVisibleText(markdown);
  const visibleTextWithSoftBreaks = markdownVisibleText(markdown, true, true);
  const normalizedVisible = normalizeText(visibleText);
  const normalizedGenericVisible = normalizeText(markdownVisibleText(markdown, false));
  const maskedMarkdownLabels = content.split('');
  visitMarkdown(markdown, (node) => {
    if (
      ![
        'link',
        'linkReference',
        'image',
        'imageReference',
        'definition',
      ].includes(node.type)
    ) {
      return;
    }
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return;
    const opening = content.indexOf('[', start);
    if (opening < start || opening >= end) return;
    const closing = findMarkdownLabelEnd(content, opening, end);
    if (closing < 0) return;
    for (let index = opening + 1; index < closing; index += 1) {
      if (maskedMarkdownLabels[index] !== '\n' && maskedMarkdownLabels[index] !== '\r') {
        maskedMarkdownLabels[index] = ' ';
      }
    }
  });
  const normalizedWithoutLinks = normalizeText(maskedMarkdownLabels.join(''));
  const matchesKnown = KNOWN_PLACEHOLDERS.some((placeholder) =>
    [normalized, normalizedVisible].some((candidate) =>
      candidate.includes(normalizeText(placeholder))
    )
  );
  const matchesTemplate = [normalized, normalizedVisible].some((candidate) =>
    /\{\{[^{}]+\}\}|<REPLACE_ME>|\bTODO_LEGAL\b/.test(candidate)
  );
  const genericPlaceholder =
    /\[(?:RAZON|CUIT|DOMICILIO|EMAIL|JURISDICCION|HORARIO|REEMPLAZAR|COMPLETAR|PENDIENTE)[^\]]*\]/;
  const matchesGeneric = [normalizedWithoutLinks, normalizedGenericVisible].some((candidate) =>
    genericPlaceholder.test(candidate)
  );
  if (matchesKnown || matchesTemplate || matchesGeneric) {
    issues.push(issue('PLACEHOLDER_FOUND', target));
  }

  const editorialMarker =
    /\bBORRADOR\b|NO PUBLICAR|NO COBRAR|(?:VERSION|VIGENCIA)[^\r\n]{0,40}\b(?:NO ASIGNAD[AO]|NO DEFINID[AO])\b|(?:RESPONSABLE|PRESTADOR|PROVEEDOR)[^\r\n]{0,40}\bA COMPLETAR\b|PENDIENTE DE REVISION/;
  const softBreakEditorialMarker =
    /\bBORRADOR\b|NO PUBLICAR|NO COBRAR|PENDIENTE DE REVISION/;
  const editorialSourceCandidates = [
    normalizeTextPreservingLines(content),
    normalizeTextPreservingLines(visibleText),
  ];
  if (
    editorialSourceCandidates.some((candidate) => editorialMarker.test(candidate)) ||
    softBreakEditorialMarker.test(normalizeTextPreservingLines(visibleTextWithSoftBreaks))
  ) {
    issues.push(issue('EDITORIAL_MARKER_FOUND', target));
  }
  return issues;
};

const collectRuntimeFiles = async (root) => {
  const sourceRoot = path.join(root, 'src');
  const files = [];
  const symlinks = [];

  const walk = async (directory) => {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }

    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isSymbolicLink()) {
        symlinks.push(relative);
      } else if (entry.isDirectory()) {
        if (!['test', 'tests', '__tests__'].includes(entry.name)) await walk(absolute);
      } else if (
        entry.isFile() &&
        RUNTIME_EXTENSIONS.has(path.extname(entry.name)) &&
        !/\.(?:test|spec)\.[jt]sx?$/.test(entry.name) &&
        !entry.name.endsWith('.d.ts')
      ) {
        files.push(absolute);
      }
    }
  };

  try {
    const sourceMetadata = await lstat(sourceRoot);
    if (sourceMetadata.isSymbolicLink()) symlinks.push('src');
    else if (sourceMetadata.isDirectory()) await walk(sourceRoot);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const rootEntryFiles = ['index.html'];
  for (const entryFile of rootEntryFiles) {
    const absolute = path.join(root, entryFile);
    try {
      const metadata = await lstat(absolute);
      if (metadata.isSymbolicLink()) symlinks.push(entryFile);
      else if (metadata.isFile()) files.push(absolute);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const environmentExample = path.join(root, '.env.example');
  try {
    const metadata = await lstat(environmentExample);
    if (metadata.isSymbolicLink()) symlinks.push('.env.example');
    else if (metadata.isFile()) files.push(environmentExample);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return { files, symlinks };
};

const validateRuntime = async (root) => {
  const issues = [];
  const { files, symlinks } = await collectRuntimeFiles(root);
  for (const target of symlinks) {
    issues.push(
      issue('RUNTIME_SYMLINK_FOUND', safeOutputTarget(target, 'RUNTIME_SOURCE'))
    );
  }

  for (const absolute of files) {
    const content = await readFile(absolute, 'utf8');
    const target = safeOutputTarget(path.relative(root, absolute), 'RUNTIME_SOURCE');
    const commerceRelated =
      /(?:plan|pro|suscrip|checkout|billing|pago|price|precio|monto)/i.test(target) ||
      /(?:plan\s+pro|pasar\s+a\s+pro|suscripci[oó]n|checkout)/i.test(content);
    const fixedProPrice = /\b24(?:[.\s_]?900)\b|\bMP_AMOUNT\b/.test(content);
    const currencyLiteral = /(?:\$\s*|\bARS\s+)\d[\d._\s]*/i.test(content);
    const amountAssignment = PLAN_AMOUNT_ASSIGNMENT.test(content);
    if (fixedProPrice || (commerceRelated && (currencyLiteral || amountAssignment))) {
      issues.push(issue('PRO_PRICE_LITERAL_FOUND', target));
    }
    if (
      /ordenfix_unsigned|upload_preset|VITE_CLOUDINARY_UPLOAD_PRESET|\bunsigned\s*:\s*true|\btype\s*:\s*['"]unsigned['"]/i.test(content)
    ) {
      issues.push(issue('UNSIGNED_UPLOAD_SOURCE_FOUND', target));
    }
  }
  return issues;
};

const collectArtifactFiles = async (root) => {
  const artifactRoot = path.join(root, 'dist');
  const files = [];
  const symlinks = [];

  let metadata;
  try {
    metadata = await lstat(artifactRoot);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { files, symlinks, missing: true, hasIndex: false };
    }
    throw error;
  }
  if (metadata.isSymbolicLink()) {
    return { files, symlinks: ['dist'], missing: false, hasIndex: false };
  }
  if (!metadata.isDirectory()) {
    return { files, symlinks, missing: true, hasIndex: false };
  }

  let hasIndex = false;

  const walk = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isSymbolicLink()) symlinks.push(relative);
      else if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) {
        if (relative.split(path.sep).join('/') === 'dist/index.html') hasIndex = true;
        files.push(absolute);
      }
    }
  };

  await walk(artifactRoot);
  return { files, symlinks, missing: false, hasIndex };
};

export const validatePublicArtifacts = async (root) => {
  const issues = [];
  const { files, symlinks, missing, hasIndex } = await collectArtifactFiles(root);
  if (missing) issues.push(issue('PUBLIC_ARTIFACT_MISSING', 'dist'));
  if (!hasIndex) issues.push(issue('PUBLIC_ARTIFACT_ENTRY_MISSING', 'dist/index.html'));
  for (const target of symlinks) {
    issues.push(
      issue('PUBLIC_ARTIFACT_SYMLINK_FOUND', safeOutputTarget(target, 'PUBLIC_ARTIFACT'))
    );
  }

  for (const absolute of files) {
    const buffer = await readFile(absolute);
    const target = safeOutputTarget(path.relative(root, absolute), 'PUBLIC_ARTIFACT');
    let content;
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      if (
        target === 'dist/index.html' ||
        TEXTUAL_ARTIFACT_EXTENSIONS.has(path.extname(absolute).toLowerCase())
      ) {
        issues.push(issue('PUBLIC_ARTIFACT_UTF8_REQUIRED', target));
      }
      continue;
    }
    const currencyAmount =
      '(?:AR\\$|\\$|ARS)\\s*(?:\\d{1,3}(?:[._\\s]\\d{3})+|\\d{3,})(?:,\\d{2})?';
    const hasContextualPlanPrice = new RegExp(
      `(?:PRO|PLAN|SUSCRIPCI[OÓ]N).{0,120}${currencyAmount}|${currencyAmount}.{0,120}(?:PRO|PLAN|SUSCRIPCI[OÓ]N)`,
      'i'
    ).test(content);
    const hasNamedPlanAmount = PLAN_SPECIFIC_AMOUNT_ASSIGNMENT.test(content);
    if (
      /(?:\$\s*(?:\d{1,3}(?:[._\s]\d{3})+(?:,\d{2})?|\d{4,})(?![a-z0-9_$])|\bARS\s+\d{2,})/i.test(
        content
      ) || hasContextualPlanPrice || hasNamedPlanAmount
    ) {
      issues.push(issue('PRO_PRICE_LITERAL_FOUND', target));
    }
    if (
      /ordenfix_unsigned|upload_preset|VITE_CLOUDINARY_UPLOAD_PRESET|\bunsigned\s*:\s*true|\btype\s*:\s*['"]unsigned['"]/i.test(
        content
      )
    ) {
      issues.push(issue('UNSIGNED_UPLOAD_SOURCE_FOUND', target));
    }
  }
  return uniqueSortedIssues(issues);
};

const hasForbiddenLegalControl = (value) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      (codePoint <= 0x001f && ![0x0009, 0x000a, 0x000d].includes(codePoint)) ||
      codePoint === 0x007f ||
      (codePoint >= 0x0080 && codePoint <= 0x009f)
    );
  });

const hasUnicodeNoncharacter = (value) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
      (codePoint & 0xfffe) === 0xfffe
    );
  });

const hasUnpairedSurrogate = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const current = value.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const hasCanonicalTextViolation = (value) =>
  value.startsWith('\ufeff') ||
  value.includes('\r') ||
  hasForbiddenLegalControl(value) ||
  value !== value.normalize('NFC') ||
  hasUnpairedSurrogate(value) ||
  hasUnicodeNoncharacter(value);

const safeReadUtf8 = async (absolute, target, issues) => {
  const buffer = await readFile(absolute);
  let content;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    issues.push(issue('DOCUMENT_UTF8_REQUIRED', target));
    return null;
  }
  const hasUtf8Bom =
    buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  if (hasUtf8Bom || hasCanonicalTextViolation(content)) {
    issues.push(issue('DOCUMENT_CANONICAL_TEXT_REQUIRED', target));
  }
  return { buffer, content };
};

const decodeCodePoint = (rawValue, radix, fallback) => {
  const codePoint = Number.parseInt(rawValue, radix);
  return Number.isInteger(codePoint) &&
    codePoint >= 0 &&
    codePoint <= 0x10ffff &&
    !(codePoint >= 0xd800 && codePoint <= 0xdfff)
    ? String.fromCodePoint(codePoint)
    : fallback;
};

const decodeLinkEntities = (value) =>
  value
    .replace(/&#x([a-f0-9]+);/gi, (match, hex) => decodeCodePoint(hex, 16, match))
    .replace(/&#(\d+);/g, (match, decimal) => decodeCodePoint(decimal, 10, match))
    .replace(/&colon;/gi, ':')
    .replace(/&tab;|&newline;/gi, '');

const decodeMarkdownBackslashEscapes = (value) =>
  value.replace(/\\([!-/:-@[-`{-~])/g, '$1');

const isActiveDestination = (rawValue) => {
  const decoded = decodeMarkdownBackslashEscapes(decodeLinkEntities(rawValue ?? ''));
  const compact = [...decoded]
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint > 0x20 && codePoint !== 0x7f;
    })
    .join('')
    .replace(/^</, '')
    .toLowerCase();
  return ['javascript:', 'vbscript:', 'data:'].some((scheme) => compact.startsWith(scheme));
};

const inlineVisibleText = (node) => {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  if (node.type === 'break') return ' ';
  if (node.type === 'image') return node.alt ?? '';
  return (node.children ?? []).map(inlineVisibleText).join('');
};

const readRawMarkdownDestination = (content, start, limit) => {
  let cursor = start;
  while (cursor < limit && /\s/u.test(content[cursor])) cursor += 1;
  if (content[cursor] === '<') {
    const closing = content.indexOf('>', cursor + 1);
    return closing >= 0 && closing < limit ? content.slice(cursor + 1, closing) : '';
  }

  let escaped = false;
  let parenthesisDepth = 0;
  const destinationStart = cursor;
  while (cursor < limit) {
    const character = content[cursor];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (/\s/u.test(character)) {
      break;
    } else if (character === '(') {
      parenthesisDepth += 1;
    } else if (character === ')' && parenthesisDepth === 0) {
      break;
    } else if (character === ')') {
      parenthesisDepth -= 1;
    }
    cursor += 1;
  }
  return content.slice(destinationStart, cursor);
};

const rawMarkdownDestinations = (node, content) => {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return [];
  const rawNode = content.slice(start, end).trim();
  if (node.type === 'link' && rawNode.startsWith('<') && rawNode.endsWith('>')) {
    return [rawNode.slice(1, -1)];
  }

  const opening = content.indexOf('[', start);
  if (opening < start || opening >= end) return [];
  const closing = findMarkdownLabelEnd(content, opening, end);
  if (closing < 0) return [];
  let cursor = closing + 1;
  if (node.type === 'definition') {
    if (content[cursor] !== ':') return [];
    cursor += 1;
  } else {
    if (content[cursor] !== '(') return [];
    cursor += 1;
  }
  const destination = readRawMarkdownDestination(content, cursor, end);
  return destination ? [destination] : [];
};

const hasUnsafeMarkdown = (content) => {
  const markdown = fromMarkdown(content);
  let firstAtxH1;
  let forbiddenHtml = false;
  let forbiddenDestination = false;

  visitMarkdown(markdown, (node) => {
    if (node.type === 'heading' && node.depth === 1 && firstAtxH1 === undefined) {
      const start = node.position?.start?.offset;
      const end = node.position?.end?.offset;
      if (Number.isInteger(start) && Number.isInteger(end)) {
        const rawHeading = content.slice(start, end);
        const match = /^[ ]{0,3}#(?:[ \t]+(.*))?$/.exec(rawHeading);
        if (match) {
          const title = stripUnicodeWhitespace(inlineVisibleText(node));
          const sourceTitle = stripUnicodeWhitespace(match[1] ?? '');
          firstAtxH1 = {
            plainText:
              (node.children ?? []).every((child) => child.type === 'text') &&
              sourceTitle === title &&
              !sourceTitle.includes('~~'),
            title,
          };
        }
      }
    }

    if (node.type === 'html') forbiddenHtml = true;
    if (['link', 'image', 'definition'].includes(node.type)) {
      if (
        isActiveDestination(node.url) ||
        rawMarkdownDestinations(node, content).some(isActiveDestination)
      ) {
        forbiddenDestination = true;
      }
      if (node.type === 'link') {
        const start = node.position?.start?.offset;
        const end = node.position?.end?.offset;
        if (Number.isInteger(start) && Number.isInteger(end)) {
          const rawLink = content.slice(start, end).trim();
          const normalizedDestination = (node.url ?? '').toLowerCase();
          if (
            rawLink.startsWith('<') &&
            rawLink.endsWith('>') &&
            !normalizedDestination.startsWith('https://') &&
            !normalizedDestination.startsWith('mailto:')
          ) {
            forbiddenHtml = true;
          }
        }
      }
    }
  });

  const invalidH1 =
    !firstAtxH1 ||
    !isPublishableText(firstAtxH1.title) ||
    !firstAtxH1.plainText ||
    [...stripUnicodeWhitespace(firstAtxH1.title)].length > 300;
  return invalidH1 || forbiddenHtml || forbiddenDestination;
};

const validateAgainstSchema = async (root, manifest, target, issues) => {
  const schemaTarget = 'docs/legal/publication-manifest.schema.json';
  let schema;
  try {
    const schemaAbsolute = path.join(root, schemaTarget);
    const metadata = await lstat(schemaAbsolute);
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      (await hasSymlinkComponent(root, schemaAbsolute)) ||
      !isInside(await realpath(root), await realpath(schemaAbsolute))
    ) {
      throw new Error('schema-path');
    }
    schema = JSON.parse(await readFile(schemaAbsolute, 'utf8'));
  } catch {
    issues.push(issue('MANIFEST_SCHEMA_UNAVAILABLE', schemaTarget));
    return;
  }

  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (!validate(manifest)) issues.push(issue('MANIFEST_SCHEMA_INVALID', target));
  } catch {
    issues.push(issue('MANIFEST_SCHEMA_UNAVAILABLE', schemaTarget));
  }
};

const validatePublisher = (manifest, environment, target, issues) => {
  const publisher = manifest.publisherSnapshot;
  if (
    !hasOnlyProperties(publisher, [
      'legalName',
      'taxId',
      'legalAddress',
      'jurisdiction',
      'businessHours',
      'contacts',
    ])
  ) {
    issues.push(issue('MANIFEST_PUBLISHER_INVALID', target));
    return;
  }

  if (!nonEmptyString(publisher.taxId)) {
    issues.push(issue('MANIFEST_PUBLISHER_INVALID', target));
  }
  for (const property of ['legalName', 'taxId', 'legalAddress', 'jurisdiction', 'businessHours']) {
    if (typeof publisher[property] === 'string') {
      issues.push(
        ...findPlaceholderIssues(
          publisher[property],
          `${target}#publisherSnapshot.${property}`
        )
      );
    }
  }
  for (const property of ['legalName', 'legalAddress', 'jurisdiction', 'businessHours']) {
    if (!isPublishableText(publisher[property])) {
      issues.push(issue('MANIFEST_PUBLISHER_INVALID', target));
    }
  }

  const contacts = publisher.contacts;
  if (!hasOnlyProperties(contacts, ['legalEmail', 'privacyEmail', 'supportEmail'])) {
    issues.push(issue('MANIFEST_CONTACTS_INVALID', target));
    return;
  }

  for (const [property, variable] of [
    ['legalEmail', 'VITE_LEGAL_EMAIL'],
    ['privacyEmail', 'VITE_PRIVACY_EMAIL'],
    ['supportEmail', 'VITE_SUPPORT_EMAIL'],
  ]) {
    if (typeof contacts[property] === 'string') {
      issues.push(
        ...findPlaceholderIssues(
          contacts[property],
          `${target}#publisherSnapshot.contacts.${property}`
        )
      );
    }
    if (!isPublicEmail(contacts[property])) issues.push(issue('MANIFEST_CONTACTS_INVALID', target));
    const configured = environment[variable]?.trim();
    if (configured && contacts[property]?.toLowerCase() !== configured.toLowerCase()) {
      issues.push(issue('CONTACT_MISMATCH', variable));
    }
  }
};

const validateReviews = (manifest, target, issues) => {
  const review = manifest.review;
  if (!hasOnlyProperties(review, ['legal', 'accounting'])) {
    issues.push(issue('PROFESSIONAL_REVIEW_REQUIRED', `${target}#review`));
  }
  for (const discipline of ['legal', 'accounting']) {
    const approval = review?.[discipline];
    if (
      !approval ||
      !hasOnlyProperties(approval, ['status', 'reference', 'reviewedAt']) ||
      approval.status !== 'APPROVED' ||
      !nonEmptyString(approval.reference) ||
      !validDate(approval.reviewedAt)
    ) {
      issues.push(issue('PROFESSIONAL_REVIEW_REQUIRED', `${target}#review.${discipline}`));
    }
    if (nonEmptyString(approval?.reference)) {
      issues.push(
        ...findPlaceholderIssues(
          approval.reference,
          `${target}#review.${discipline}.reference`
        )
      );
    }
  }
};

const validateDocuments = async (manifest, manifestDirectory, root, target, issues) => {
  if (!Array.isArray(manifest.documents) || manifest.documents.length === 0) {
    issues.push(issue('MANIFEST_DOCUMENTS_INVALID', target));
    return new Map();
  }

  const documentsByKey = new Map();
  const types = new Set();
  const sources = new Set();
  for (const document of manifest.documents) {
    const safeSource = SAFE_SOURCE_PATH.test(document?.source ?? '');
    const documentTarget = safeSource
      ? safeOutputTarget(
          path.join(path.relative(root, manifestDirectory), document.source),
          target
        )
      : target;
    const structurallyValid =
      document &&
      hasOnlyProperties(document, [
        'key',
        'type',
        'version',
        'locale',
        'source',
        'sha256',
        'effectiveAt',
        'contexts',
        'requiresReacceptance',
      ]) &&
      SAFE_IDENTIFIER.test(document.key ?? '') &&
      DOCUMENT_TYPES.has(document.type) &&
      VERSION.test(document.version ?? '') &&
      document.locale === manifest.locale &&
      safeSource &&
      SHA256.test(document.sha256 ?? '') &&
      validDate(document.effectiveAt) &&
      Array.isArray(document.contexts) &&
      document.contexts.length > 0 &&
      new Set(document.contexts).size === document.contexts.length &&
      document.contexts.every((context) => LEGAL_CONTEXTS.has(context)) &&
      typeof document.requiresReacceptance === 'boolean';

    if (!structurallyValid) {
      issues.push(issue('MANIFEST_DOCUMENT_INVALID', documentTarget));
      continue;
    }
    if (documentsByKey.has(document.key)) {
      issues.push(issue('MANIFEST_DUPLICATE_DOCUMENT', document.key));
    } else {
      documentsByKey.set(document.key, document);
    }
    types.add(document.type);
    if (sources.has(document.source)) {
      issues.push(issue('MANIFEST_DUPLICATE_DOCUMENT_SOURCE', documentTarget));
    }
    sources.add(document.source);

    const absolute = path.resolve(manifestDirectory, document.source);
    if (!isInside(manifestDirectory, absolute)) {
      issues.push(issue('DOCUMENT_PATH_INVALID', documentTarget));
      continue;
    }

    let metadata;
    try {
      metadata = await lstat(absolute);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        issues.push(issue('DOCUMENT_NOT_FOUND', documentTarget));
        continue;
      }
      throw error;
    }
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      (await hasSymlinkComponent(manifestDirectory, absolute))
    ) {
      issues.push(issue('DOCUMENT_PATH_INVALID', documentTarget));
      continue;
    }

    const resolvedDirectory = await realpath(manifestDirectory);
    const resolvedDocument = await realpath(absolute);
    if (!isInside(resolvedDirectory, resolvedDocument)) {
      issues.push(issue('DOCUMENT_PATH_INVALID', documentTarget));
      continue;
    }

    const file = await safeReadUtf8(absolute, documentTarget, issues);
    if (!file) continue;
    issues.push(...findPlaceholderIssues(file.content, documentTarget));
    if (hasUnsafeMarkdown(file.content)) {
      issues.push(issue('UNSAFE_MARKDOWN_FOUND', documentTarget));
    }
    if (sha256(file.buffer) !== document.sha256.toLowerCase()) {
      issues.push(issue('MANIFEST_DIGEST_MISMATCH', documentTarget));
    }
  }

  for (const requiredType of REQUIRED_DOCUMENT_TYPES) {
    if (!types.has(requiredType)) issues.push(issue('REQUIRED_DOCUMENT_MISSING', requiredType));
  }
  return documentsByKey;
};

const validateRequirements = (manifest, documentsByKey, target, issues) => {
  if (!Array.isArray(manifest.requirements) || manifest.requirements.length === 0) {
    issues.push(issue('MANIFEST_REQUIREMENTS_INVALID', target));
    return;
  }

  const keys = new Set();
  const coverage = new Map();
  const documentCoverage = new Map();
  const referencedDocuments = new Set();
  for (const requirement of manifest.requirements) {
    const requirementTarget = SAFE_IDENTIFIER.test(requirement?.key ?? '')
      ? requirement.key
      : target;
    const structurallyValid =
      requirement &&
      hasOnlyProperties(requirement, [
        'key',
        'version',
        'context',
        'roles',
        'actType',
        'statement',
        'statementSha256',
        'documents',
        'required',
        'requiresReacceptance',
      ]) &&
      SAFE_IDENTIFIER.test(requirement.key ?? '') &&
      VERSION.test(requirement.version ?? '') &&
      LEGAL_CONTEXTS.has(requirement.context) &&
      Array.isArray(requirement.roles) &&
      requirement.roles.length > 0 &&
      new Set(requirement.roles).size === requirement.roles.length &&
      requirement.roles.every((role) => LEGAL_ROLES.has(role)) &&
      ['ACEPTACION', 'LECTURA', 'DECLARACION'].includes(requirement.actType) &&
      nonEmptyString(requirement.statement) &&
      SHA256.test(requirement.statementSha256 ?? '') &&
      Array.isArray(requirement.documents) &&
      requirement.documents.length > 0 &&
      new Set(requirement.documents).size === requirement.documents.length &&
      requirement.documents.every(nonEmptyString) &&
      typeof requirement.required === 'boolean' &&
      typeof requirement.requiresReacceptance === 'boolean';

    if (!structurallyValid) {
      issues.push(issue('MANIFEST_REQUIREMENT_INVALID', requirementTarget));
      continue;
    }
    if (keys.has(requirement.key)) issues.push(issue('MANIFEST_DUPLICATE_REQUIREMENT', requirement.key));
    keys.add(requirement.key);
    if (!isPublishableText(requirement.statement)) {
      issues.push(issue('MANIFEST_REQUIREMENT_INVALID', requirementTarget));
    }
    issues.push(...findPlaceholderIssues(requirement.statement, `${requirementTarget}#statement`));
    if (hasCanonicalTextViolation(requirement.statement)) {
      issues.push(issue('REQUIREMENT_CANONICAL_TEXT_REQUIRED', requirementTarget));
    }
    if (
      sha256(Buffer.from(requirement.statement, 'utf8')) !==
      requirement.statementSha256.toLowerCase()
    ) {
      issues.push(issue('REQUIREMENT_DIGEST_MISMATCH', requirementTarget));
    }
    const compatibleDocuments = [];
    for (const documentKey of requirement.documents) {
      const document = documentsByKey.get(documentKey);
      if (!document) {
        issues.push(issue('REQUIREMENT_DOCUMENT_UNKNOWN', requirementTarget));
      } else if (!document.contexts.includes(requirement.context)) {
        issues.push(issue('REQUIREMENT_CONTEXT_MISMATCH', requirementTarget));
      } else {
        compatibleDocuments.push(document);
      }
      if (document) referencedDocuments.add(documentKey);
    }

    if (requirement.required) {
      const coveredRoles = coverage.get(requirement.context) ?? new Set();
      for (const role of requirement.roles) coveredRoles.add(role);
      coverage.set(requirement.context, coveredRoles);
      for (const role of requirement.roles) {
        const coverageKey = `${requirement.context}:${role}`;
        const coveredDocumentTypes = documentCoverage.get(coverageKey) ?? new Set();
        for (const document of compatibleDocuments) coveredDocumentTypes.add(document.type);
        documentCoverage.set(coverageKey, coveredDocumentTypes);
      }
    }
  }

  for (const required of REQUIRED_REQUIREMENTS) {
    const coveredRoles = coverage.get(required.context) ?? new Set();
    for (const role of required.roles) {
      if (!coveredRoles.has(role)) {
        issues.push(issue('REQUIRED_REQUIREMENT_MISSING', `${required.context}:${role}`));
      }
      const coverageKey = `${required.context}:${role}`;
      const coveredDocumentTypes = documentCoverage.get(coverageKey) ?? new Set();
      for (const documentType of required.documentTypes) {
        if (!coveredDocumentTypes.has(documentType)) {
          issues.push(
            issue(
              'REQUIRED_REQUIREMENT_DOCUMENT_MISSING',
              `${coverageKey}:${documentType}`
            )
          );
        }
      }
    }
  }

  for (const documentKey of documentsByKey.keys()) {
    if (!referencedDocuments.has(documentKey)) {
      issues.push(issue('REQUIRED_DOCUMENT_UNBOUND', documentKey));
    }
  }
};

const validateManifest = async (root, environment, configuredManifest) => {
  const issues = [];
  if (!configuredManifest?.trim()) {
    return [issue('MANIFEST_NOT_CONFIGURED', 'ORDENFIX_LEGAL_PUBLICATION_MANIFEST')];
  }

  const absoluteRoot = path.resolve(root);
  const publicationsRoot = path.resolve(absoluteRoot, 'docs/legal/publications');
  const absolute = path.resolve(absoluteRoot, configuredManifest);
  const target = safeOutputTarget(
    path.relative(absoluteRoot, absolute) || 'publication-manifest.json',
    'ORDENFIX_LEGAL_PUBLICATION_MANIFEST'
  );
  if (!isInside(publicationsRoot, absolute) || path.basename(absolute) !== 'publication-manifest.json') {
    return [issue('MANIFEST_PATH_INVALID', 'ORDENFIX_LEGAL_PUBLICATION_MANIFEST')];
  }

  let metadata;
  try {
    metadata = await lstat(absolute);
  } catch (error) {
    if (error?.code === 'ENOENT') return [issue('MANIFEST_NOT_FOUND', target)];
    throw error;
  }
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    (await hasSymlinkComponent(absoluteRoot, absolute))
  ) {
    return [issue('MANIFEST_PATH_INVALID', target)];
  }

  const resolvedRoot = await realpath(absoluteRoot);
  const resolvedPublicationsRoot = await realpath(publicationsRoot);
  const resolvedManifest = await realpath(absolute);
  if (
    !isInside(resolvedRoot, resolvedPublicationsRoot) ||
    !isInside(resolvedPublicationsRoot, resolvedManifest)
  ) {
    return [issue('MANIFEST_PATH_INVALID', target)];
  }

  const raw = await readFile(absolute, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return [...issues, issue('MANIFEST_JSON_INVALID', target)];
  }

  await validateAgainstSchema(absoluteRoot, manifest, target, issues);

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    issues.push(issue('MANIFEST_HEADER_INVALID', target));
    return issues;
  }

  if (
    !hasOnlyProperties(manifest, [
      '$schema',
      'schemaVersion',
      'publicationId',
      'locale',
      'publisherSnapshot',
      'review',
      'documents',
      'requirements',
    ]) ||
    manifest.schemaVersion !== 1 ||
    !SAFE_IDENTIFIER.test(manifest.publicationId ?? '') ||
    manifest.locale !== 'es-AR'
  ) {
    issues.push(issue('MANIFEST_HEADER_INVALID', target));
  }
  if (manifest.publicationId !== path.basename(path.dirname(absolute))) {
    issues.push(issue('MANIFEST_PUBLICATION_ID_MISMATCH', target));
  }
  validatePublisher(manifest, environment, target, issues);
  validateReviews(manifest, target, issues);
  const documentsByKey = await validateDocuments(
    manifest,
    path.dirname(absolute),
    absoluteRoot,
    target,
    issues
  );
  validateRequirements(manifest, documentsByKey, target, issues);
  return issues;
};

const uniqueSortedIssues = (issues) => {
  const byKey = new Map();
  for (const entry of issues) byKey.set(`${entry.code}\0${entry.target}`, entry);
  return [...byKey.values()].sort(
    (left, right) => left.code.localeCompare(right.code) || left.target.localeCompare(right.target)
  );
};

export const validatePublicRelease = async ({ root, environment, manifestPath }) => {
  const configuredManifest = manifestPath ?? environment.ORDENFIX_LEGAL_PUBLICATION_MANIFEST;
  const results = await Promise.all([
    Promise.resolve(validatePublicEnvironment(environment)),
    validateManifest(root, environment, configuredManifest),
    validateRuntime(root),
  ]);
  return uniqueSortedIssues(results.flat());
};

export const formatHumanResult = (issues) => {
  if (issues.length === 0) return 'PUBLIC_RELEASE_READY';
  return ['PUBLIC_RELEASE_BLOCKED', ...issues.map((entry) => `- ${entry.code}: ${entry.target}`)].join('\n');
};
