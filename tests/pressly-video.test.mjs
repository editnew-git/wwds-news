import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import presslyVideo, { parsePresslyVideoUrl } from '../src/lib/pressly-video.mjs';

const id = 'aB0_-Cd1234';
const url = `https://www.youtube.com/watch?v=${id}`;
const processor = await createMarkdownProcessor({ rehypePlugins: [presslyVideo] });

test('canonical markers allow only exact HTTPS host, video ID and bounded start', () => {
  assert.deepEqual(parsePresslyVideoUrl(url), { id, start: 0 });
  assert.deepEqual(parsePresslyVideoUrl(url + '&start=90'), { id, start: 90 });
  for (const invalid of [
    url.replace('https:', 'http:'), url.replace('www.youtube.com', 'evil.example'),
    url.replace('www.youtube.com', 'www.youtube.com.evil.example'),
    url.replace('www.youtube.com', 'www.youtube.com@evil.example'),
    url + '&autoplay=1', url + '#fragment', url + '&v=' + id,
    url.replace(id, 'short'), url + 'extra', 'javascript:alert(1)',
    'https://www.youtube.com/embed/' + id, 'https://youtu.be/' + id, url + '\n', null,
    url + '&start=-1', url + '&start=1.5', url + '&start=2147483648', url + '&start=1&start=2',
  ]) assert.equal(parsePresslyVideoUrl(invalid), null, String(invalid));
});

test('standalone marker renders one accessible player and a plain caption without a Watch link', async () => {
  const result = await processor.render('[Pressly video](' + url + ' "Workshop walkthrough")');
  assert.match(result.code, /class="pressly-video"/);
  assert.match(result.code, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/aB0_-Cd1234"/);
  assert.match(result.code, /title="Workshop walkthrough"/);
  assert.match(result.code, /loading="lazy"/);
  assert.match(result.code, /<figcaption>Workshop walkthrough<\/figcaption>/);
  assert.doesNotMatch(result.code, /<a\b|autoplay|Watch this/);
  assert.equal((result.code.match(/<iframe/g) ?? []).length, 1);
});

test('an intentional start survives Markdown serialization', async () => {
  const result = await processor.render('[Pressly video](' + url + '&start=90 "Demonstration")');
  assert.match(result.code, /youtube-nocookie\.com\/embed\/aB0_-Cd1234\?start=90/);
});

test('ordinary references, inline markers, code and existing non-YouTube HTML retain their behavior', async () => {
  const result = await processor.render('[Source](' + url + ')\n\nSee [Pressly video](' + url + ') for context.\n\n' + String.fromCharCode(96).repeat(3) + 'md\n[Pressly video](' + url + ')\n' + String.fromCharCode(96).repeat(3) + '\n\n<iframe src="https://iframe.wwds.co/?campId=123" title="Layout"></iframe>');
  assert.doesNotMatch(result.code, /youtube-nocookie/);
  assert.match(result.code, /iframe\.wwds\.co/);
  assert.match(result.code, /<a href=/);
});

test('bad explicit markers fail rather than becoming arbitrary iframe hosts', () => {
  const tree = { type: 'root', children: [{ type: 'element', tagName: 'p', children: [
    { type: 'element', tagName: 'a', properties: { href: 'https://evil.example/watch?v=aB0_-Cd1234' }, children: [{ type: 'text', value: 'Pressly video' }] },
  ] }] };
  assert.throws(() => presslyVideo()(tree), /Invalid Pressly video URL/);
});

test('titles are escaped by the serializer, never interpolated as HTML', async () => {
  const result = await processor.render('[Pressly video](' + url + ' "A &quot; onload=&quot;alert(1)&quot; &lt;script&gt;demo&lt;/script&gt; &amp; more")');
  assert.doesNotMatch(result.code.replace(/"[^"]*"/g, '""'), /<script>|onload=/);
  assert.match(result.code, /&#x22;|&quot;/);
  assert.doesNotMatch(result.code, /<figcaption><a/);
});
