import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLpArgs, parseDefaultPrinter, parsePrinterBlocks, parseJobs, mapCupsPrinter, resolveQueueName,
} from '../backend/cupsPrinter.js';

const LPSTAT_P = `printer EPSON_L8050_Series is idle.  enabled since Sat Nov 28 10:00:00 2026
\tForm mounted:
\tContent types: any
\tDescription: EPSON L8050 Series
\tAlerts: media-empty-error marker-supply-low-warning
\tLocation:
printer Canon_A4 now printing Canon_A4-7.  enabled since Sat Nov 28 10:05:00 2026
\tDescription: Canon A4
\tAlerts: none
printer Old_HP disabled since Fri Nov 27 09:00:00 2026 -
\treason unknown
\tDescription: Old HP
\tAlerts: offline-report
`;

const LPSTAT_O = `Canon_A4-7              kiosk          204800   Sat Nov 28 10:05:00 2026
EPSON_L8050_Series-12   kiosk          102400   Sat Nov 28 10:06:00 2026
`;

test('lp args: silent copies, fit-to-page, media and driver options, file after --', () => {
  assert.deepEqual(
    buildLpArgs('/tmp/a.pdf', { printer: 'EPSON_L8050_Series', copies: 2, scale: 'fit', paperSize: 'A4', cupsOptions: { MediaType: 'photographic-glossy' } }),
    ['-d', 'EPSON_L8050_Series', '-n', '2', '-o', 'fit-to-page', '-o', 'MediaType=photographic-glossy', '-o', 'media=A4', '--', '/tmp/a.pdf'],
  );
  // cupsOptions.media wins over the Windows paperSize
  assert.ok(buildLpArgs('/x.pdf', { printer: 'P', paperSize: 'A4', cupsOptions: { media: 'A4.Borderless' } }).includes('media=A4.Borderless'));
  assert.throws(() => buildLpArgs('/x.pdf', { printer: 'P', copies: 0 }));
  assert.throws(() => buildLpArgs('/x.pdf', { printer: 'P', cupsOptions: { media: 'A4 -d other' } }));
  assert.throws(() => buildLpArgs('/x.pdf', {}));
});

test('parses lpstat printers, default destination and jobs', () => {
  const printers = parsePrinterBlocks(LPSTAT_P);
  assert.deepEqual(printers.map((p) => [p.name, p.description, p.disabled, p.printing]), [
    ['EPSON_L8050_Series', 'EPSON L8050 Series', false, false],
    ['Canon_A4', 'Canon A4', false, true],
    ['Old_HP', 'Old HP', true, false],
  ]);
  assert.deepEqual(printers[0].reasons, ['media-empty-error', 'marker-supply-low-warning']);
  assert.deepEqual(printers[1].reasons, []);
  assert.equal(parseDefaultPrinter('system default destination: Canon_A4\n'), 'Canon_A4');
  assert.equal(parseDefaultPrinter('no system default destination\n'), null);
  const jobs = parseJobs(LPSTAT_O);
  assert.deepEqual(jobs.map((j) => [j.PrinterName, j.Id]), [['Canon_A4', 7], ['EPSON_L8050_Series', 12]]);
});

test('maps CUPS state reasons to kiosk status codes', () => {
  const printers = parsePrinterBlocks(LPSTAT_P);
  const jobs = parseJobs(LPSTAT_O);
  const [epson, canon, hp] = printers.map((p) => mapCupsPrinter(p, jobs));
  assert.equal(epson.statusCode, 'paper_out');
  assert.equal(epson.isUserIntervention, false); // low ink warning alone is not an error
  assert.equal(epson.jobsCount, 1);
  assert.equal(canon.statusCode, 'printing');
  assert.equal(hp.statusCode, 'offline');
  const jammed = mapCupsPrinter({ name: 'X', disabled: false, printing: false, reasons: ['media-jam-error'] }, []);
  assert.equal(jammed.statusCode, 'paper_jam');
  const door = mapCupsPrinter({ name: 'X', disabled: false, printing: false, reasons: ['cover-open-error'] }, []);
  assert.equal(door.statusCode, 'door_open');
});

test('a profile saved on Windows still finds its CUPS queue', () => {
  const printers = parsePrinterBlocks(LPSTAT_P);
  assert.equal(resolveQueueName('EPSON L8050 Series', printers), 'EPSON_L8050_Series');
  assert.equal(resolveQueueName('epson_l8050_series', printers), 'EPSON_L8050_Series');
  assert.equal(resolveQueueName('Canon A4', printers), 'Canon_A4');
  assert.equal(resolveQueueName('Brother', printers), null);
});
