import { existsSync } from 'node:fs';
import { join } from 'node:path';

const publicDir = join(process.cwd(), 'public');

export const getPublicAsset = (assetPath?: string) => {
  if (!assetPath?.startsWith('/')) return undefined;

  const localPath = join(publicDir, assetPath.replace(/^\/+/, ''));
  return existsSync(localPath) ? assetPath : undefined;
};
