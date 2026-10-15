import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('control UI keeps every element targeted by the client code',async()=>{
  const [html,script]=await Promise.all([
    readFile(new URL('../public/index.html',import.meta.url),'utf8'),
    readFile(new URL('../public/app.js',import.meta.url),'utf8')
  ]);
  const ids=[...script.matchAll(/\$\('#([^']+)'\)/g)].map(match=>match[1]);
  assert.ok(ids.length>30);
  const missing=[...new Set(ids)].filter(id=>!html.includes(`id="${id}"`));
  assert.deepEqual(missing,[]);
  assert.match(html,/data-mode="timer"/);
  assert.match(html,/data-jog="300"/);
});
