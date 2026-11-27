import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';

const require = createRequire(import.meta.url);
function load(file, theme) {
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(file, 'utf8'), { loader: file.endsWith('tsx') ? 'tsx' : 'ts', format: 'cjs', jsx: 'automatic' }).code;
  vm.runInNewContext(code, { module, require: id => {
    if (id.endsWith('/KioskThemeContext')) return { useKioskTheme: () => ({ theme }) };
    if (id.startsWith('.')) {
      const target = path.resolve(path.dirname(file), id);
      return load(target + (fs.existsSync(target + '.ts') ? '.ts' : '.tsx'), theme);
    }
    return require(id);
  } });
  return module.exports;
}
function component(name, theme = { assetPack: 'woset-play' }) {
  return load(path.resolve(`src/app/components/${name}.tsx`), theme)[name];
}

test('timer exposes normal, urgent and critical states at the exact countdown boundaries', () => {
  const TimerBar = component('TimerBar');
  for (const [timeLeft, state] of [[301, 'normal'], [300, 'urgent'], [61, 'urgent'], [60, 'critical'], [0, 'critical']]) {
    const timer = TimerBar({ minutes: '05', seconds: '00', timeLeft });
    assert.equal(timer.props['data-timer-state'], state);
    assert.equal(timer.props.role, 'timer');
    assert.match(timer.props['aria-label'], /05 menit 00 detik/);
  }
});

test('quantity controls announce the product, prevent negative counts, and emit the next count', () => {
  const Quantity = component('KioskQuantityControl');
  const changes = [];
  const [minus, value, plus] = Quantity({ value: 0, label: 'Kotak Metal', onChange: value => changes.push(value) }).props.children;
  assert.equal(minus.props.disabled, true);
  assert.equal(value.props['aria-label'], 'Jumlah Kotak Metal');
  assert.equal(plus.props['aria-label'], 'Tambah Kotak Metal');
  minus.props.onClick();
  plus.props.onClick();
  assert.deepEqual(changes, [0, 1]);
});

test('illustrated card overrides apply to UI surfaces, while photo capture cards retain their configured styling', () => {
  const Card = component('BrutalistCard');
  const capture = Card({ children: 'photo canvas' });
  assert.equal(capture.props.style.borderWidth, 'var(--kiosk-border-w, 4px)');
  const surface = Card({ children: 'product', selected: true, 'data-kiosk-ui': 'surface' });
  assert.equal(surface.props.style.borderWidth, '1px');
  assert.equal(surface.props.style.borderRadius, '28px');
  assert.equal(surface.props.style.backgroundColor, '#d6c57440');
  assert.equal(surface.props['data-kiosk-selected'], true);
  const legacyCard = component('BrutalistCard', { assetPack: 'none' });
  assert.equal(legacyCard({ children: 'other preset', 'data-kiosk-ui': 'surface' }).props.style.borderWidth, 'var(--kiosk-border-w, 4px)');
});

test('Riso artwork follows the active pack and explicit draft previews never leak the active Woset pack', () => {
  const Artwork = component('WosetArtwork', { assetPack: 'riso-zine' });
  assert.equal(Artwork({ scene: 'studio' }).props.src, '/themes/riso-zine/studio.svg');
  assert.equal(Artwork({ scene: 'studio', pack: 'woset-play' }).props.src, '/themes/woset-play/studio.svg');
  const WosetArtwork = component('WosetArtwork', { assetPack: 'woset-play' });
  assert.equal(WosetArtwork({ scene: 'welcome', pack: 'riso-zine' }).props.src, '/themes/riso-zine/welcome.svg');
});

test('Riso surfaces use their own geometry and ink state while capture cards remain unchanged', () => {
  const Card = component('BrutalistCard', { assetPack: 'riso-zine' });
  assert.equal(Card({ children: 'photo' }).props.style.borderWidth, 'var(--kiosk-border-w, 4px)');
  const surface = Card({ children: 'product', selected: true, 'data-kiosk-ui': 'surface' });
  assert.equal(surface.props.style.borderRadius, '10px');
  assert.equal(surface.props.style.backgroundColor, '#df644f1f');
});

test('illustrated template buttons discard legacy forced hover text colors', () => {
  const Button = component('ButtonTemplate', { assetPack: 'riso-zine' });
  const button = Button({ children: 'Cetak 1', className: '!text-black hover:!text-white', 'data-kiosk-ui': 'control' });
  assert.equal(button.props.className.includes('!text'), false);
});

test('Analog Archive resolves its own art and styles only interface cards', () => {
  const Artwork = component('WosetArtwork', { assetPack: 'analog-archive' });
  assert.equal(Artwork({ scene: 'frames' }).props.src, '/themes/analog-archive/frames.svg');
  const Card = component('BrutalistCard', { assetPack: 'analog-archive' });
  assert.equal(Card({ children: 'photo' }).props.style.borderWidth, 'var(--kiosk-border-w, 4px)');
  const surface = Card({ children: 'product', 'data-kiosk-ui': 'surface' });
  assert.equal(surface.props.style.borderRadius, '8px');
  assert.equal(surface.props.style.backgroundColor, '#232723');
});

test('Studio Cats uses its own scene assets and leaves captured photo cards independent', () => {
  const Artwork = component('WosetArtwork', { assetPack: 'studio-cats' });
  for (const scene of ['welcome', 'studio', 'booth', 'friends', 'frames', 'keepsake', 'ready']) {
    assert.equal(Artwork({ scene }).props.src, `/themes/studio-cats/${scene}.svg`);
    assert.ok(fs.existsSync(`public/themes/studio-cats/${scene}.svg`));
  }
  const Card = component('BrutalistCard', { assetPack: 'studio-cats' });
  assert.equal(Card({ children: 'photo' }).props.style.borderWidth, 'var(--kiosk-border-w, 4px)');
  const surface = Card({ children: 'product', 'data-kiosk-ui': 'surface' });
  assert.equal(surface.props.style.borderRadius, '12px');
  assert.equal(surface.props.style.backgroundColor, 'var(--kiosk-card-bg)');
});

test('Studio Cats large service cards open the selected service directly', () => {
  const Home = component('StudioCatsHome');
  const chosen = [];
  const tree = Home({ theme: { studioName: 'IGNOS STUDIO', homeHeadline: 'POSE. SNAP. MEOW.', homeSubheadline: 'Pilih layananmu.' }, onSelectService: id => chosen.push(id), onStaffImport: () => {} });
  const buttons = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'button') buttons.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  assert.equal(buttons.length, 2);
  buttons.find(button => button.props['aria-label'] === 'Photo Studio').props.onClick();
  buttons.find(button => button.props['aria-label'] === 'Photo Box').props.onClick();
  assert.deepEqual(chosen, ['photo-studio', 'photo-box']);
});
