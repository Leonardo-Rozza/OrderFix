#!/usr/bin/env node
import process from 'node:process';
import { loadEnv } from 'vite';
import {
  formatHumanResult,
  getReleaseCheckLevel,
  validatePublicApiEnvironment,
  validatePublicArtifacts,
  validatePublicRelease,
} from './lib/public-release-validation.mjs';

const parseArguments = (argumentsList) => {
  const options = {
    mode: 'auto',
    format: 'human',
    manifestPath: undefined,
    artifactOnly: false,
  };
  for (const argument of argumentsList) {
    if (argument === '--force') options.mode = 'public';
    else if (argument === '--if-deploy' || argument === '--if-production') options.mode = 'auto';
    else if (argument === '--runtime') options.mode = 'runtime';
    else if (argument === '--artifacts') {
      options.mode = 'public';
      options.artifactOnly = true;
    } else if (argument === '--artifacts-if-deploy') {
      options.mode = 'auto';
      options.artifactOnly = true;
    }
    else if (argument.startsWith('--mode=')) options.mode = argument.slice('--mode='.length);
    else if (argument.startsWith('--format=')) options.format = argument.slice('--format='.length);
    else if (argument.startsWith('--manifest=')) options.manifestPath = argument.slice('--manifest='.length);
    else throw new Error('Argumento no reconocido.');
  }
  if (!['auto', 'public', 'runtime', 'development'].includes(options.mode)) {
    throw new Error('Modo no reconocido.');
  }
  if (!['human', 'json'].includes(options.format)) throw new Error('Formato no reconocido.');
  return options;
};

try {
  const options = parseArguments(process.argv.slice(2));
  const root = process.cwd();
  const loadedEnvironment = loadEnv('production', root, '');
  const environment = { ...loadedEnvironment, ...process.env };

  const level = getReleaseCheckLevel(options.mode, environment);
  if (options.artifactOnly && level !== 'public') {
    process.stdout.write('PUBLIC_ARTIFACT_CHECK_SKIPPED\n');
  } else if (level === 'skip') {
    process.stdout.write('PUBLIC_RELEASE_CHECK_SKIPPED\n');
  } else {
    const issues =
      options.artifactOnly
        ? await validatePublicArtifacts(root)
        : level === 'runtime'
        ? validatePublicApiEnvironment(environment)
        : await validatePublicRelease({
            root,
            environment,
            manifestPath: options.manifestPath,
          });
    if (options.format === 'json') {
      process.stdout.write(
        `${JSON.stringify({ level, ready: issues.length === 0, issues }, null, 2)}\n`
      );
    } else if (options.artifactOnly) {
      const output =
        issues.length === 0
          ? 'PUBLIC_ARTIFACTS_READY'
          : [
              'PUBLIC_ARTIFACTS_BLOCKED',
              ...issues.map((entry) => `- ${entry.code}: ${entry.target}`),
            ].join('\n');
      process.stdout.write(`${output}\n`);
    } else if (level === 'runtime') {
      const output =
        issues.length === 0
          ? 'RUNTIME_CONFIG_READY'
          : [
              'RUNTIME_CONFIG_BLOCKED',
              ...issues.map((entry) => `- ${entry.code}: ${entry.target}`),
            ].join('\n');
      process.stdout.write(`${output}\n`);
    } else {
      process.stdout.write(`${formatHumanResult(issues)}\n`);
    }
    if (issues.length > 0) process.exitCode = 1;
  }
} catch {
  process.stderr.write('PUBLIC_RELEASE_CHECK_ERROR\n');
  process.exitCode = 2;
}
