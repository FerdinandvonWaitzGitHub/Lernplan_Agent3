import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const sourceDir = resolve(projectRoot, 'src', 'templates');
const targetDir = resolve(projectRoot, 'dist', 'templates');

mkdirSync(targetDir, { recursive: true });

for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
        cpSync(join(sourceDir, entry.name), join(targetDir, entry.name));
    }
}
