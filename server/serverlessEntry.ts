import { createApiApp } from './apiApp.ts';

const app = createApiApp({ normalizeServerlessPaths: true });

export default app;
