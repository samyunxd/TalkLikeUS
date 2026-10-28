import { createApiApp } from './apiApp.ts';

export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

const app = createApiApp({ normalizeServerlessPaths: true });

export default app;
