import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  findPlaceholderIssues,
  formatHumanResult,
  getReleaseCheckLevel,
  shouldRunPublicReleaseCheck,
  validatePublicArtifacts,
  validatePublicEnvironment,
  validatePublicRelease,
} from './lib/public-release-validation.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const validEnvironment = {
  VITE_API_BASE_URL: 'https://api.ordenfix.com',
  VITE_LEGAL_EMAIL: 'legal@ordenfix.com',
  VITE_PRIVACY_EMAIL: 'privacidad@ordenfix.com',
  VITE_SUPPORT_EMAIL: 'soporte@ordenfix.com',
};

const digest = (value) => createHash('sha256').update(value).digest('hex');

const createReadyFixture = async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ordenfix-release-'));
  const publicationDirectory = path.join(root, 'docs/legal/publications/2026-08-inicial');
  await mkdir(publicationDirectory, { recursive: true });
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, 'src/app.ts'), "export const appName = 'OrdenFix';\n");
  await writeFile(
    path.join(root, 'docs/legal/publication-manifest.schema.json'),
    await readFile(path.join(repositoryRoot, 'docs/legal/publication-manifest.schema.json'), 'utf8')
  );

  const definitions = [
    [
      'terminos',
      'TERMINOS_SERVICIO',
      ['REGISTRO', 'USO_CONTINUADO', 'CONTRATACION_PRO'],
      true,
    ],
    ['privacidad', 'POLITICA_PRIVACIDAD', ['REGISTRO', 'USO_CONTINUADO'], true],
    [
      'tratamiento-datos',
      'ACUERDO_TRATAMIENTO_DATOS',
      ['REGISTRO', 'USO_CONTINUADO'],
      true,
    ],
    ['condiciones-pro', 'CONDICIONES_PRO', ['CONTRATACION_PRO'], true],
    [
      'cancelaciones-reembolsos',
      'POLITICA_CANCELACIONES_REEMBOLSOS',
      ['CONTRATACION_PRO', 'ARREPENTIMIENTO'],
      true,
    ],
    ['cierre-cuenta', 'POLITICA_CIERRE_CUENTA', ['CIERRE_CUENTA'], true],
    [
      'aviso-clientes-taller',
      'AVISO_CLIENTES_TALLER',
      ['ATESTACION_FOTOS', 'ATESTACION_CREDENCIALES'],
      false,
    ],
    [
      'terminos-usuario',
      'TERMINOS_USUARIO',
      ['PRIMER_INGRESO_EMPLEADO', 'USO_CONTINUADO'],
      true,
    ],
    [
      'aviso-privacidad-usuario',
      'AVISO_PRIVACIDAD_USUARIO',
      ['PRIMER_INGRESO_EMPLEADO', 'USO_CONTINUADO'],
      true,
    ],
    [
      'compromiso-confidencialidad',
      'COMPROMISO_CONFIDENCIALIDAD',
      ['PRIMER_INGRESO_EMPLEADO', 'USO_CONTINUADO'],
      true,
    ],
    [
      'atestacion-datos-cliente',
      'ATESTACION_DATOS_CLIENTE',
      ['ATESTACION_FOTOS', 'ATESTACION_CREDENCIALES'],
      true,
    ],
  ];
  const documents = [];
  for (const [key, type, contexts, requiresReacceptance] of definitions) {
    const source = `${key}.md`;
    const content = `# ${key}\n\nVersión final revisada para OrdenFix.\n`;
    await writeFile(path.join(publicationDirectory, source), content);
    documents.push({
      key,
      type,
      version: '1.0.0',
      locale: 'es-AR',
      source,
      sha256: digest(content),
      effectiveAt: '2026-09-01T00:00:00-03:00',
      contexts,
      requiresReacceptance,
    });
  }

  const createRequirement = (key, context, roles, documentKeys, actType = 'ACEPTACION') => {
    const statement = `Confirmo el requisito ${key} de OrdenFix.`;
    return {
      key,
      version: '1.0.0',
      context,
      roles,
      actType,
      statement,
      statementSha256: digest(statement),
      documents: documentKeys,
      required: true,
      requiresReacceptance: true,
    };
  };

  const manifest = {
    schemaVersion: 1,
    publicationId: '2026-08-inicial',
    locale: 'es-AR',
    publisherSnapshot: {
      legalName: 'OrdenFix Argentina SAS',
      taxId: '30-00000000-0',
      legalAddress: 'Calle Pública 100, CABA',
      jurisdiction: 'Ciudad Autónoma de Buenos Aires',
      businessHours: 'Lunes a viernes de 9 a 17 h',
      contacts: {
        legalEmail: validEnvironment.VITE_LEGAL_EMAIL,
        privacyEmail: validEnvironment.VITE_PRIVACY_EMAIL,
        supportEmail: validEnvironment.VITE_SUPPORT_EMAIL,
      },
    },
    review: {
      legal: {
        status: 'APPROVED',
        reference: 'LEGAL-2026-001',
        reviewedAt: '2026-08-20T12:00:00-03:00',
      },
      accounting: {
        status: 'APPROVED',
        reference: 'ACCOUNTING-2026-001',
        reviewedAt: '2026-08-20T12:00:00-03:00',
      },
    },
    documents,
    requirements: [
      createRequirement('admin-registration', 'REGISTRO', ['ADMIN_TITULAR'], [
        'terminos',
        'privacidad',
        'tratamiento-datos',
      ]),
      createRequirement('employee-first-login', 'PRIMER_INGRESO_EMPLEADO', ['USER'], [
        'terminos-usuario',
        'aviso-privacidad-usuario',
        'compromiso-confidencialidad',
      ]),
      createRequirement('pro-checkout', 'CONTRATACION_PRO', ['ADMIN_TITULAR'], [
        'terminos',
        'condiciones-pro',
        'cancelaciones-reembolsos',
      ]),
      createRequirement(
        'customer-photo-attestation',
        'ATESTACION_FOTOS',
        ['ADMIN_TITULAR', 'USER'],
        ['aviso-clientes-taller', 'atestacion-datos-cliente'],
        'DECLARACION'
      ),
      createRequirement(
        'customer-credential-attestation',
        'ATESTACION_CREDENCIALES',
        ['ADMIN_TITULAR', 'USER'],
        ['aviso-clientes-taller', 'atestacion-datos-cliente'],
        'DECLARACION'
      ),
      createRequirement('account-closure', 'CIERRE_CUENTA', ['ADMIN_TITULAR'], [
        'cierre-cuenta',
      ]),
    ],
  };
  const manifestPath = 'docs/legal/publications/2026-08-inicial/publication-manifest.json';
  await writeFile(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  return { root, manifest, manifestPath, publicationDirectory };
};

const persistManifest = (fixture) =>
  writeFile(
    path.join(fixture.root, fixture.manifestPath),
    `${JSON.stringify(fixture.manifest, null, 2)}\n`
  );

test('el modo automático separa runtime de publicación pública', () => {
  assert.equal(getReleaseCheckLevel('auto', {}), 'skip');
  assert.equal(getReleaseCheckLevel('auto', { VERCEL_ENV: 'preview' }), 'runtime');
  assert.equal(getReleaseCheckLevel('auto', { CI: 'true' }), 'runtime');
  assert.equal(getReleaseCheckLevel('auto', { VERCEL_ENV: 'production' }), 'public');
  assert.equal(getReleaseCheckLevel('public', {}), 'public');
  assert.equal(getReleaseCheckLevel('runtime', {}), 'runtime');
  assert.equal(shouldRunPublicReleaseCheck('auto', {}), false);
  assert.equal(shouldRunPublicReleaseCheck('auto', { VERCEL_ENV: 'preview' }), true);
  assert.equal(shouldRunPublicReleaseCheck('auto', { VERCEL_ENV: 'production' }), true);
  assert.equal(shouldRunPublicReleaseCheck('public', {}), true);
});

test('la configuración pública rechaza URL ausente, insegura o contradictoria', () => {
  assert.deepEqual(validatePublicEnvironment({}).map(({ code }) => code), [
    'API_URL_MISSING',
    'CONTACT_MISSING',
    'CONTACT_MISSING',
    'CONTACT_MISSING',
  ]);
  assert.ok(
    validatePublicEnvironment({ ...validEnvironment, VITE_API_BASE_URL: 'http://localhost:8080' }).some(
      ({ code }) => code === 'API_URL_HTTPS_REQUIRED'
    )
  );
  assert.ok(
    validatePublicEnvironment({ ...validEnvironment, VITE_API_BASE_URL: 'https://api.example.com' }).some(
      ({ code }) => code === 'API_URL_PUBLIC_HOST_REQUIRED'
    )
  );
  assert.ok(
    validatePublicEnvironment({ ...validEnvironment, VITE_API_BASE_URL: 'https://api' }).some(
      ({ code }) => code === 'API_URL_PUBLIC_HOST_REQUIRED'
    )
  );
  assert.ok(
    validatePublicEnvironment({ ...validEnvironment, VITE_API_BASE_URL: 'https://8.8.8.8' }).some(
      ({ code }) => code === 'API_URL_PUBLIC_HOST_REQUIRED'
    )
  );
  for (const value of [
    'https://-bad.com',
    'https://a..com',
    'https://foo.home.arpa',
    'https://api.localdomain',
  ]) {
    assert.ok(
      validatePublicEnvironment({ ...validEnvironment, VITE_API_BASE_URL: value }).some(
        ({ code }) => code === 'API_URL_PUBLIC_HOST_REQUIRED'
      )
    );
  }
  assert.ok(
    validatePublicEnvironment({
      ...validEnvironment,
      VITE_API_URL: 'https://otra-api.ordenfix.com',
    }).some(({ code }) => code === 'API_URL_CONFLICT')
  );
});

test('la configuración pública canonicaliza el punto final del dominio', () => {
  assert.deepEqual(
    validatePublicEnvironment({
      ...validEnvironment,
      VITE_API_BASE_URL: 'https://api.ordenfix.com.',
      VITE_API_URL: 'https://api.ordenfix.com/api',
    }),
    []
  );
});

test('la configuración pública rechaza contactos inválidos o de ejemplo', () => {
  const issues = validatePublicEnvironment({
    ...validEnvironment,
    VITE_LEGAL_EMAIL: 'legal@example.com',
    VITE_PRIVACY_EMAIL: 'sin-arroba',
  });
  assert.equal(issues.filter(({ code }) => code === 'CONTACT_INVALID').length, 2);
  for (const value of [
    'legal@127.0.0.1',
    'legal@equipo.local',
    'legal@api.internal',
    'legal@api.localdomain',
    '.legal@ordenfix.com',
    'legal..ops@ordenfix.com',
  ]) {
    assert.ok(
      validatePublicEnvironment({ ...validEnvironment, VITE_LEGAL_EMAIL: value }).some(
        ({ code }) => code === 'CONTACT_INVALID'
      )
    );
  }
});

test('detecta variantes tipográficas de placeholders', () => {
  assert.equal(findPlaceholderIssues('Titular: [RAZON\u00a0SOCIAL]', 'terminos.md').length, 1);
  assert.equal(findPlaceholderIssues('Contacto: {{privacy_email}}', 'privacidad.md').length, 1);
  assert.equal(findPlaceholderIssues('[AAIP](https://www.argentina.gob.ar)', 'legal.md').length, 0);
  assert.equal(
    findPlaceholderIssues('[Email de soporte](mailto:soporte@ordenfix.com)', 'legal.md').length,
    0
  );
  assert.equal(findPlaceholderIssues('- [ ] Opción no seleccionada', 'modelo.md').length, 0);
  assert.equal(
    findPlaceholderIssues('Avisaremos antes de publicar una nueva versión.', 'legal.md').length,
    0
  );
});

test('rechaza marcadores editoriales aunque ya no queden corchetes', () => {
  assert.deepEqual(findPlaceholderIssues('BORRADOR — NO PUBLICAR', 'terminos.md'), [
    { code: 'EDITORIAL_MARKER_FOUND', target: 'terminos.md' },
  ]);
  assert.deepEqual(findPlaceholderIssues('Vigencia: no definida', 'privacidad.md'), [
    { code: 'EDITORIAL_MARKER_FOUND', target: 'privacidad.md' },
  ]);
});

test('una publicación completa y canónica queda lista', async () => {
  const fixture = await createReadyFixture();
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.deepEqual(issues, []);
});

test('aplica el JSON Schema real antes de habilitar la publicación', async () => {
  const fixture = await createReadyFixture();
  fixture.manifest.publisherSnapshot.taxId = 'formato-invalido';
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'MANIFEST_SCHEMA_INVALID'));
});

test('exige cobertura por contexto, rol y documento compatible', async () => {
  const fixture = await createReadyFixture();
  fixture.manifest.documents.find(({ key }) => key === 'terminos').contexts = [
    'USO_CONTINUADO',
    'CONTRATACION_PRO',
  ];
  fixture.manifest.requirements = fixture.manifest.requirements.filter(
    ({ context }) => context !== 'CIERRE_CUENTA'
  );
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'REQUIREMENT_CONTEXT_MISMATCH'));
  assert.ok(
    issues.some(
      ({ code, target }) =>
        code === 'REQUIRED_REQUIREMENT_MISSING' && target === 'CIERRE_CUENTA:ADMIN_TITULAR'
    )
  );
});

test('exige fuentes únicas y que cada documento quede vinculado', async () => {
  const fixture = await createReadyFixture();
  fixture.manifest.documents[1].source = fixture.manifest.documents[0].source;
  fixture.manifest.requirements[0].documents = fixture.manifest.requirements[0].documents.filter(
    (key) => key !== 'privacidad'
  );
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'MANIFEST_DUPLICATE_DOCUMENT_SOURCE'));
  assert.ok(
    issues.some(
      ({ code, target }) => code === 'REQUIRED_DOCUMENT_UNBOUND' && target === 'privacidad'
    )
  );
  assert.ok(
    issues.some(
      ({ code, target }) =>
        code === 'REQUIRED_REQUIREMENT_DOCUMENT_MISSING' &&
        target === 'REGISTRO:ADMIN_TITULAR:POLITICA_PRIVACIDAD'
    )
  );
});

test('acepta timestamps ISO con precisión de microsegundos del backend Java', async () => {
  const fixture = await createReadyFixture();
  fixture.manifest.review.legal.reviewedAt = '2026-08-20T12:00:00.123456-03:00';
  fixture.manifest.review.accounting.reviewedAt = '2026-08-20T12:00:00.123456-03:00';
  for (const document of fixture.manifest.documents) {
    document.effectiveAt = '2026-09-01T00:00:00.123456-03:00';
  }
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.deepEqual(issues, []);
});

test('hashea exactamente el texto aceptado y exige NFC sin CR', async () => {
  const fixture = await createReadyFixture();
  const statement = 'Confirmo Cafe\u0301 para OrdenFix.';
  fixture.manifest.requirements[0].statement = statement;
  fixture.manifest.requirements[0].statementSha256 = digest(statement);
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'REQUIREMENT_CANONICAL_TEXT_REQUIRED'));
  assert.ok(!issues.some(({ code }) => code === 'REQUIREMENT_DIGEST_MISMATCH'));
});

test('rechaza HTML o esquemas activos dentro del Markdown legal', async () => {
  const fixture = await createReadyFixture();
  const document = fixture.manifest.documents[0];
  const content = [
    '# Términos',
    '',
    '<svg',
    'onload=alert(1)>',
    '[acción][destino]',
    '[destino]: java&#x73;cript:alert(1)',
    '',
  ].join('\n');
  await writeFile(path.join(fixture.publicationDirectory, document.source), content);
  document.sha256 = digest(content);
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'UNSAFE_MARKDOWN_FOUND'));
});

test('rechaza un directorio padre enlazado fuera de la publicación', async () => {
  const fixture = await createReadyFixture();
  const publications = path.join(fixture.root, 'docs/legal/publications');
  const movedPublications = path.join(fixture.root, 'moved-publications');
  await rename(publications, movedPublications);
  await symlink(movedPublications, publications, 'dir');
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'MANIFEST_PATH_INVALID'));
});

test('sanea targets controlados por el manifiesto en salida humana y JSON', async () => {
  const fixture = await createReadyFixture();
  const malicious = 'archivo\n\u001b[31msecreto.md';
  fixture.manifest.documents[0].source = malicious;
  fixture.manifest.requirements[0].key = 'clave\n\u001b[31msecreta';
  await persistManifest(fixture);
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  const humanOutput = formatHumanResult(issues);
  const jsonOutput = JSON.stringify(issues);
  assert.doesNotMatch(humanOutput, /secreto/i);
  assert.doesNotMatch(jsonOutput, /secreto/i);
  assert.equal(humanOutput.includes('\u001b'), false);
  assert.equal(jsonOutput.includes('\u001b'), false);
});

test('bloquea un manifiesto ausente y un digest alterado', async () => {
  const fixture = await createReadyFixture();
  const missing = await validatePublicRelease({ root: fixture.root, environment: validEnvironment });
  assert.ok(missing.some(({ code }) => code === 'MANIFEST_NOT_CONFIGURED'));

  fixture.manifest.documents[0].sha256 = '0'.repeat(64);
  await writeFile(
    path.join(fixture.root, fixture.manifestPath),
    `${JSON.stringify(fixture.manifest, null, 2)}\n`
  );
  const altered = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(altered.some(({ code }) => code === 'MANIFEST_DIGEST_MISMATCH'));
});

test('bloquea precio PRO fijo y subida unsigned en código productivo', async () => {
  const fixture = await createReadyFixture();
  await writeFile(
    path.join(fixture.root, 'src/app.ts'),
    "export const price = '$24.900'; export const preset = 'ordenfix_unsigned';\n"
  );
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(issues.some(({ code }) => code === 'PRO_PRICE_LITERAL_FOUND'));
  assert.ok(issues.some(({ code }) => code === 'UNSIGNED_UPLOAD_SOURCE_FOUND'));
});

test('escanea también datos y estilos productivos relacionados con planes', async () => {
  const fixture = await createReadyFixture();
  await writeFile(
    path.join(fixture.root, 'src/plan-config.json'),
    JSON.stringify({ checkoutCopy: 'ARS 1999 por mes' })
  );
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(
    issues.some(
      ({ code, target }) =>
        code === 'PRO_PRICE_LITERAL_FOUND' && target === 'src/plan-config.json'
    )
  );
});

test('detecta un precio PRO nuevo en módulos no clásicos', async () => {
  const fixture = await createReadyFixture();
  await mkdir(path.join(fixture.root, 'src/components'), { recursive: true });
  await writeFile(
    path.join(fixture.root, 'src/components/ProCard.mjs'),
    'const monthlyRate = 29900; document.body.textContent = "Plan PRO: " + monthlyRate;\n'
  );
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.ok(
    issues.some(
      ({ code, target }) =>
        code === 'PRO_PRICE_LITERAL_FOUND' && target === 'src/components/ProCard.mjs'
    )
  );
});

test('el control post-build inspecciona archivos copiados desde public', async () => {
  const fixture = await createReadyFixture();
  await mkdir(path.join(fixture.root, 'dist/assets'), { recursive: true });
  await writeFile(path.join(fixture.root, 'dist/index.html'), '<main>OrdenFix</main>\n');
  assert.deepEqual(await validatePublicArtifacts(fixture.root), []);
  await writeFile(
    path.join(fixture.root, 'dist/assets/public-copy.js'),
    "globalThis.offer = 'Plan PRO por $999'; globalThis.monthlyRate = 29900;\n"
  );
  const issues = await validatePublicArtifacts(fixture.root);
  assert.deepEqual(issues, [
    { code: 'PRO_PRICE_LITERAL_FOUND', target: 'dist/assets/public-copy.js' },
  ]);
});

test('el control post-build exige una entrada real y regular', async () => {
  const fixture = await createReadyFixture();
  await mkdir(path.join(fixture.root, 'dist'), { recursive: true });
  assert.deepEqual(await validatePublicArtifacts(fixture.root), [
    { code: 'PUBLIC_ARTIFACT_ENTRY_MISSING', target: 'dist/index.html' },
  ]);
});

test('el control post-build bloquea código textual que no sea UTF-8', async () => {
  const fixture = await createReadyFixture();
  await mkdir(path.join(fixture.root, 'dist'), { recursive: true });
  await writeFile(path.join(fixture.root, 'dist/index.html'), '<main>OrdenFix</main>\n');
  await writeFile(
    path.join(fixture.root, 'dist/evil.js'),
    Buffer.concat([Buffer.from([0xff]), Buffer.from('ordenfix_unsigned')])
  );
  assert.deepEqual(await validatePublicArtifacts(fixture.root), [
    { code: 'PUBLIC_ARTIFACT_UTF8_REQUIRED', target: 'dist/evil.js' },
  ]);
});

test('no confunde una carga firmada por backend con un preset unsigned', async () => {
  const fixture = await createReadyFixture();
  await writeFile(
    path.join(fixture.root, 'src/app.ts'),
    [
      "const endpoint = 'https://api.cloudinary.com/v1_1/cloud/image/upload';",
      'const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;',
      'export const signedUpload = { endpoint, cloudName, signatureFromBackend: true };',
      '',
    ].join('\n')
  );
  const issues = await validatePublicRelease({
    root: fixture.root,
    environment: validEnvironment,
    manifestPath: fixture.manifestPath,
  });
  assert.deepEqual(issues, []);
});

test('los mensajes no filtran valores sensibles', () => {
  const secret = 'NO-DEBE-APARECER';
  const issues = validatePublicEnvironment({
    ...validEnvironment,
    VITE_API_BASE_URL: `https://usuario:${secret}@api.ordenfix.com`,
  });
  assert.doesNotMatch(formatHumanResult(issues), new RegExp(secret));
});

test('Vercel usa el mismo build protegido del repositorio', async () => {
  const config = JSON.parse(await readFile(path.join(repositoryRoot, 'vercel.json'), 'utf8'));
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'));
  assert.match(packageJson.scripts.build, /--artifacts-if-deploy/);
});

test('CI y preview ejecutan el guard runtime sin exigir una publicación legal', async () => {
  const fixture = await createReadyFixture();
  const result = spawnSync(
    process.execPath,
    [path.join(repositoryRoot, 'scripts/check-public-release.mjs'), '--if-deploy'],
    {
      cwd: fixture.root,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: 'true',
        VERCEL_ENV: '',
        ORDENFIX_PUBLIC_RELEASE: '',
        VITE_API_BASE_URL: 'https://ci-api.ordenfix.com',
        VITE_API_URL: '',
        VITE_LEGAL_EMAIL: '',
        VITE_PRIVACY_EMAIL: '',
        VITE_SUPPORT_EMAIL: '',
        ORDENFIX_LEGAL_PUBLICATION_MANIFEST: '',
      },
    }
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /RUNTIME_CONFIG_READY/);
});

test('el entrypoint público acepta una fixture completa y verificable', async () => {
  const fixture = await createReadyFixture();
  const result = spawnSync(
    process.execPath,
    [
      path.join(repositoryRoot, 'scripts/check-public-release.mjs'),
      '--force',
      `--manifest=${fixture.manifestPath}`,
    ],
    {
      cwd: fixture.root,
      encoding: 'utf8',
      env: {
        ...process.env,
        ...validEnvironment,
        VITE_API_URL: '',
        VERCEL_ENV: '',
        ORDENFIX_PUBLIC_RELEASE: '',
        ORDENFIX_LEGAL_PUBLICATION_MANIFEST: '',
      },
    }
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PUBLIC_RELEASE_READY/);
});

test('el build de producción falla en el guard antes de ejecutar Vite', () => {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL_ENV: 'production',
      VITE_API_BASE_URL: '',
      VITE_API_URL: '',
      VITE_LEGAL_EMAIL: '',
      VITE_PRIVACY_EMAIL: '',
      VITE_SUPPORT_EMAIL: '',
      ORDENFIX_LEGAL_PUBLICATION_MANIFEST: '',
    },
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0);
  assert.match(output, /PUBLIC_RELEASE_BLOCKED/);
  assert.doesNotMatch(output, /vite v\d/i);
});
