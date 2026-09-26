import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

test('PWA build includes valid icons and complete shell; excludes backend requests', async () => {
 const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest','utf8').replace(/^\uFEFF/,''));
 assert.equal(manifest.display, 'standalone');
 for (const icon of manifest.icons) {
   const png = readFileSync('dist' + icon.src);
   assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
 }
 const listeners = {};
 const removed = [];
 let precached = [];
 let claimed = false;
 const context = { URL, fetch: () => { throw new Error('Unexpected network access'); }, caches: {
  open: async () => ({ addAll: async urls => { precached = urls; }, match: async () => 'cached-shell' }),
  keys: async () => ['entre-dos-shell-old','unrelated-cache'], delete: async name => removed.push(name)
 }, self: { location: { origin: 'https://hogar.test' }, clients: { claim: async () => { claimed = true; } }, addEventListener: (name, callback) => listeners[name] = callback } };
 vm.runInNewContext(readFileSync('dist/sw.js','utf8'), context);
 let pending;
 listeners.install({waitUntil: value => pending = value}); await pending;
 assert.ok(precached.includes('/index.html'));
 for (const url of precached) assert.ok(existsSync('dist' + url), url);
 listeners.activate({waitUntil: value => pending = value}); await pending;
 assert.deepEqual(removed, ['entre-dos-shell-old']); assert.equal(claimed,true);
 for (const request of [
  {url:'https://backend.supabase.co/rest/v1/households',method:'GET'},
  {url:'https://hogar.test/api/data',method:'GET'},
  {url:'https://hogar.test/',method:'POST'},
 ]) listeners.fetch({request,respondWith: () => assert.fail('Must not cache data requests')});
 listeners.fetch({request:{url:'https://hogar.test/',method:'GET',mode:'navigate'},respondWith: value => pending = value});
 assert.equal(await pending,'cached-shell');
});
