// Shared Pressly publication contract; keep this renderer identical across newsroom repositories.
const MARKER = 'Pressly video';
const WATCH_URL = /^https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})(?:&start=([1-9][0-9]{0,9}))?$/;

/** Only canonical single-video markers produced by Pressly are embed inputs. */
export function parsePresslyVideoUrl(value) {
  if (typeof value !== 'string' || value !== value.trim()) return null;
  const match = WATCH_URL.exec(value);
  if (!match) return null;
  const start = Number(match[2] ?? 0);
  if (start > 2147483647) return null;
  return { id: match[1], start };
}

const text = value => ({ type: 'text', value });
const element = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });

/** Transform an explicit standalone Markdown marker; leave other links and HTML alone. */
export default function presslyVideo() {
  return function transform(tree) {
    function visit(parent) {
      if (!Array.isArray(parent.children)) return;
      for (let index = 0; index < parent.children.length; index += 1) {
        const node = parent.children[index];
        const link = node.type === 'element' && node.tagName === 'p' && node.children?.length === 1
          ? node.children[0] : undefined;
        const marked = link?.type === 'element' && link.tagName === 'a'
          && link.children?.length === 1 && link.children[0].type === 'text'
          && link.children[0].value === MARKER;
        if (!marked) { visit(node); continue; }
        const video = parsePresslyVideoUrl(link.properties?.href);
        if (!video) throw new Error('Invalid Pressly video URL: use a canonical HTTPS YouTube watch URL with one video ID and optional start seconds.');
        const title = typeof link.properties.title === 'string' && link.properties.title.trim()
          ? link.properties.title.trim() : 'Video';
        if (title.length > 300 || /[\u0000-\u001f\u007f]/.test(title)) throw new Error('Invalid Pressly video title.');
        parent.children[index] = element('figure', { className: ['pressly-video'] }, [
          element('div', { className: ['pressly-video-player'] }, [
            element('iframe', {
              src: `https://www.youtube-nocookie.com/embed/${video.id}${video.start ? `?start=${video.start}` : ''}`,
              title,
              width: 1280,
              height: 720,
              loading: 'lazy',
              referrerPolicy: 'strict-origin-when-cross-origin',
              allow: 'encrypted-media; picture-in-picture; fullscreen',
              allowFullScreen: true,
            }),
          ]),
          element('figcaption', {}, [text(title)]),
        ]);
      }
    }
    visit(tree);
  };
}
