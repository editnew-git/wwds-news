// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import presslyVideo from './src/lib/pressly-video.mjs';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://news.wwds.co',
  markdown: { processor: unified({ rehypePlugins: [presslyVideo] }) },
});
