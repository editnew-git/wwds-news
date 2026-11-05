import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

test('a fixture production build renders a full cover and the timestamped player', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pressly-news-build-'));
  try {
    for (const entry of ['src', 'public', 'package.json']) await cp(join(root, entry), join(directory, entry), { recursive: true });
    await cp(join(root, 'astro.config.mjs'), join(directory, 'site.config.mjs'));
    await writeFile(join(directory, 'astro.config.mjs'), "import base from './site.config.mjs';\nexport default { ...base, root: " + JSON.stringify(directory) + ", outDir: " + JSON.stringify(join(directory, 'dist')) + ", cacheDir: " + JSON.stringify(join(directory, '.test-astro-cache')) + ", vite: { ...base.vite, cacheDir: " + JSON.stringify(join(directory, '.test-vite-cache')) + " } };\n");
    await mkdir(join(directory, 'node_modules'));
    for (const entry of await readdir(join(root, 'node_modules'))) {
      if (!entry.startsWith('.') || entry === '.bin') await symlink(join(root, 'node_modules', entry), join(directory, 'node_modules', entry));
    }
    const content = join(directory, 'src/content/news');
    await mkdir(content, { recursive: true });
    await mkdir(join(directory, 'public/images'), { recursive: true });
    await writeFile(join(directory, 'public/images/cover-fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#fff"/><text x="20" y="680" fill="#111">Corner logo fixture</text></svg>');
    await writeFile(join(content, 'video-fixture.md'), '---\ntitle: Video test fixture\ndate: "2026-11-05"\nslug: video-fixture\nimage: /images/cover-fixture.svg\nexcerpt: A local build fixture.\ntags: [news]\n---\n\n[Pressly video](https://www.youtube.com/watch?v=aB0_-Cd1234&start=90 "Demonstration")\n');
    await run(process.execPath, [join(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', directory], {
      cwd: directory, timeout: 90000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
    });
    const article = await readFile(join(directory, 'dist/news/video-fixture/index.html'), 'utf8');
    assert.match(article, /youtube-nocookie\.com\/embed\/aB0_-Cd1234\?start=90/);
    assert.match(article, /<figcaption>Demonstration<\/figcaption>/);
    assert.doesNotMatch(article, /<a[^>]+href="https:\/\/www\.youtube\.com/);
    assert.match(article, /<img[^>]+class="article-cover"[^>]+src="\/images\/cover-fixture\.svg"/);
    let styles = [...article.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
    for (const match of article.matchAll(/href="(\/_astro\/[^"/]+\.css)"/g)) styles += '\n' + await readFile(join(directory, 'dist', match[1].slice(1)), 'utf8');
    assert.match(styles, /\.article-cover(?:\[[^\]]+\])?\{[^}]*object-fit:contain/);
    assert.match(styles, /\.pressly-video-player(?:\[[^\]]+\])?\{[^}]*aspect-ratio:16\s*\/\s*9/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
