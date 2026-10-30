import { writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['server/apiApp.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
});

const bundledCode = result.outputFiles[0].text.replace(
  /export\s*\{\s*createApiApp\s*\};\s*$/,
  ''
);

const finalServerlessModule = `${bundledCode}
// Inline Vercel serverless config & default handler
export const maxDuration = 60;
export const config = {
  maxDuration: 60
};
const app = createApiApp({ normalizeServerlessPaths: true });
export default app;
`;

await writeFile('api/index.js', finalServerlessModule, 'utf8');
