import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const files = [
  '.github/actions/install-deps/action.yml',
  'Dockerfile',
];
const nativePackages = [
  'lightningcss-linux-x64-gnu',
  '@tailwindcss/oxide-linux-x64-gnu',
  '@rolldown/binding-linux-x64-gnu',
  '@unrs/resolver-binding-linux-x64-gnu',
  '@img/sharp-linux-x64',
  '@img/sharp-libvips-linux-x64',
];

const failures = [];

for (const packageName of nativePackages) {
  const lockedVersion = lock.packages?.[`node_modules/${packageName}`]?.version;
  if (!lockedVersion) {
    failures.push(`${packageName}: missing from package-lock.json`);
    continue;
  }

  const pinPattern = new RegExp(`${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@([^\\s\\\\]+)`, 'g');

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const matches = [...content.matchAll(pinPattern)];
    if (matches.length === 0) {
      if (file === 'Dockerfile' && packageName.startsWith('@rolldown/')) {
        continue;
      }
      failures.push(`${packageName}: missing pin in ${file}`);
      continue;
    }

    for (const match of matches) {
      const pinnedVersion = match[1];
      if (pinnedVersion !== lockedVersion) {
        failures.push(`${packageName}: ${file} pins ${pinnedVersion}, lockfile has ${lockedVersion}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Native linux prebuild pins are out of sync:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Native linux prebuild pins match package-lock.json.');
