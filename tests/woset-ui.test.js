import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { transformSync } from 'esbuild';

const require = createRequire(import.meta.url);
function component(name, theme = { assetPack: 'woset-play' }) {
  const module = { exports: {} };
  const code = transformSync(fs.readFileSync(`src/app/components/${name}.tsx`, 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'automatic' }).code;
  vm.runInNewContext(code, { module, require: id => id.endsWith('/KioskThemeContext') ? { useKioskTheme: () => ({ theme }) } : require(id) });
  return module.exports[name];
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
