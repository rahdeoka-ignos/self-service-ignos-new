import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { transformSync } from 'esbuild';

function harness() {
  const slots = [], effects = [], listeners = new Map(), cache = new Map(), writes = [];
  let contextValue;
  let cursor = 0, fetcher = async () => ({ ok: false });
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => contextValue,
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(effect);
      slots[index] = deps;
    },
  };
  const context = {
    localStorage: { getItem: () => null, setItem: (key, value) => writes.push(JSON.parse(value)) },
    document: { documentElement: { style: { setProperty() {}, removeProperty() {} } } },
    window: { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name), setInterval: callback => { listeners.set('poll', callback); return 1; }, clearInterval() {} },
    console, setTimeout, clearTimeout,
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const code = transformSync(fs.readFileSync(file, 'utf8'), { loader: file.endsWith('tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic' }).code;
    vm.runInNewContext(code, { ...context, module, require: name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === 'lucide-react') return { Check: 'Check', RefreshCw: 'RefreshCw', Camera: 'Camera', Users: 'Users' };
      if (name.endsWith('/AdminLayout')) return { AdminLayout: 'AdminLayout' };
      if (name.endsWith('/AdminConfirmModal')) return { AdminConfirmModal: 'AdminConfirmModal' };
      if (name.endsWith('/usePageTitle')) return { usePageTitle() {} };
      if (name.endsWith('/api')) return { apiFetch: (...args) => fetcher(...args) };
      const base = path.resolve(path.dirname(file), name);
      return load(base + (fs.existsSync(base + '.ts') ? '.ts' : '.tsx'));
    } });
    cache.set(file, module.exports);
    return module.exports;
  }
  const utils = load(path.resolve('src/utils/kioskTheme.ts'));
  const { THEME_PRESETS: presets } = load(path.resolve('src/types/kioskTheme.ts'));
  const { KioskThemeProvider } = load(path.resolve('src/context/KioskThemeContext.tsx'));
  return { utils, presets, writes, listeners, render() { cursor = 0; contextValue = KioskThemeProvider({ children: null }).props.value; return contextValue; }, renderEditor() { cursor = 50; return load(path.resolve('src/app/screens/AdminKioskThemePage.tsx')).AdminKioskThemePage(); }, runEffects() { return effects.splice(0).map(fn => fn()); }, fetch(fn) { fetcher = fn; } };
}
const response = theme => ({ ok: true, json: async () => ({ success: true, theme }) });
const flush = () => new Promise(resolve => setImmediate(resolve));

for (const mode of ['401', '500', 'offline']) test(`theme save/reset preserve confirmed state on ${mode}`, async () => {
  const h = harness();
  h.fetch(async () => { if (mode === 'offline') throw Error(mode); return { ok: false, status: Number(mode) }; });
  const before = h.render().theme;
  assert.equal(await h.render().saveTheme(h.presets['dark-studio']), false);
  assert.equal(await h.render().resetTheme(), false);
  assert.equal(h.render().theme, before);
  assert.equal(h.writes.length, 0);
  assert.equal(h.render().saving, false);
});

test('save commits the server-confirmed configuration; reset restores defaults', async () => {
  const h = harness();
  const confirmed = { ...h.presets['dark-studio'], studioName: 'Server name' };
  h.fetch(async () => response(confirmed));
  assert.equal(await h.render().saveTheme(h.presets['dark-studio']), true);
  assert.equal(h.render().theme.studioName, 'Server name');
  assert.equal(h.writes[0].studioName, 'Server name');
  h.fetch(async () => response(h.presets['neo-brutalism']));
  assert.equal(await h.render().resetTheme(), true);
  assert.equal(h.render().theme.presetId, 'neo-brutalism');
});

test('a stale initial GET cannot overwrite a successful save', async () => {
  const h = harness();
  let resolveRead;
  h.fetch((_url, init) => init ? Promise.resolve(response(h.presets['dark-studio'])) : new Promise(resolve => { resolveRead = resolve; }));
  h.render(); h.runEffects();
  await h.render().saveTheme(h.presets['dark-studio']);
  resolveRead({ ok: true, json: async () => h.presets['neo-brutalism'] });
  await flush();
  assert.equal(h.render().theme.presetId, 'dark-studio');
  assert.equal(h.writes.length, 1);
});

test('overlapping mutations are rejected until the current save finishes', async () => {
  const h = harness();
  let finish;
  h.fetch(() => new Promise(resolve => { finish = resolve; }));
  const saving = h.render().saveTheme(h.presets['dark-studio']);
  assert.equal(h.render().saving, true);
  assert.equal(await h.render().resetTheme(), false);
  finish(response(h.presets['dark-studio']));
  assert.equal(await saving, true);
});

test('storage events and polling refresh from server and clean up on unmount', async () => {
  const h = harness();
  let current = h.presets['neo-brutalism'];
  h.fetch(async () => ({ ok: true, json: async () => current }));
  h.render(); const cleanup = h.runEffects(); await flush();
  current = h.presets['dark-studio'];
  h.listeners.get('storage')({ key: 'ignos_kiosk_theme_config' }); await flush();
  assert.equal(h.render().theme.presetId, 'dark-studio');
  current = h.presets['luxury-wedding'];
  await h.listeners.get('poll')();
  assert.equal(h.render().theme.freeEventMode, true);
  cleanup.forEach(fn => fn?.());
  assert.equal(h.listeners.has('storage'), false);
  assert.equal(h.listeners.has('focus'), false);
});

test('invalid colors cannot be saved; malformed cached fields fall back safely', async () => {
  const h = harness();
  h.fetch(() => assert.fail('Invalid data must not reach server'));
  assert.equal(await h.render().saveTheme({ ...h.presets['dark-studio'], backgroundColor: '#zzzzzz' }), false);
  const value = h.utils.normalizeTheme({ borderRadius: 'unknown', freeEventMode: 'false', studioName: null });
  assert.equal(value.borderRadius, 'lg');
  assert.equal(value.freeEventMode, false);
  assert.equal(value.studioName, 'IGNOS STUDIO');
  for (const preset of Object.values(h.presets)) {
    const vars = h.utils.themeVariables(preset);
    assert.equal(vars['--kiosk-radius'], h.utils.radiusMap[preset.borderRadius]);
    assert.equal(vars['--kiosk-shadow'], h.utils.getShadowMap(preset.borderColor)[preset.shadowStyle]);
  }
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function label(tree) {
  if (Array.isArray(tree)) return tree.map(label).join('');
  if (typeof tree === 'string') return tree;
  return tree?.props ? label(tree.props.children) : '';
}
test('editing a preset stays in draft, survives refresh, and only applies after Save', async () => {
  const h = harness();
  let current = h.presets['neo-brutalism'];
  h.fetch(async (_url, init) => init ? response(JSON.parse(init.body)) : { ok: true, json: async () => current });
  h.render(); h.runEffects(); await flush(); h.render();
  h.renderEditor(); h.runEffects();
  const preset = nodes(h.renderEditor()).find(node => node.props?.onClick && node.props.onClick.toString().includes('luxury-wedding'));
  assert.ok(preset);
  preset.props.onClick();
  assert.equal(h.render().theme.freeEventMode, false);
  current = h.presets['dark-studio'];
  await h.listeners.get('poll')();
  h.render(); h.renderEditor(); h.runEffects();
  const editor = h.renderEditor();
  const save = nodes(editor).find(node => node.type === 'button' && label(node).includes('Terapkan ke Kiosk'));
  assert.ok(save);
  await save.props.onClick();
  assert.equal(h.render().theme.presetId, 'luxury-wedding');
  assert.equal(h.render().theme.freeEventMode, true);
  h.runEffects().forEach(cleanup => cleanup?.());
});
