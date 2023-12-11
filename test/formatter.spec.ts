import { readFileSync } from 'fs';
import { formatXml, minimizeXml } from '../src/formatter';

describe('Formatter', () => {
  it.each([
    ['withPrologue'],
    ['withComment'],
    ['withCDATA'],
    ['withText'],
    ['withSpacePreserve'],
    ['withLongAttributes'],
  ])('formatting already formatted xml is no-op', (resourceName: string) => {
    const path = `./test/resources/${resourceName}.xml`;
    const data = readFileSync(path, 'utf-8');

    const formatted = formatXml(data);

    const windowsFriendly = data.replace(/\r/g, '').trim();

    expect(formatted).toEqual(windowsFriendly);
  });
});

describe('Formatter', () => {
  it.each([
    ['withPrologue'],
    ['withComment'],
    ['withCDATA'],
    ['withText'],
    ['withSpacePreserve'],
    ['withLongAttributes'],
  ])('round trip from minimized is no-op', (resourceName: string) => {
    const path = `./test/resources/${resourceName}.xml`;
    const data = readFileSync(path, 'utf-8');

    const formatted = formatXml(data);
    const minimized = minimizeXml(data, { removeComments: false });
    expect(minimized).toBeDefined();
    if (minimized === undefined) return;

    const roundTrip = formatXml(minimized);
    expect(formatted).toEqual(roundTrip);

    // console.log(formatted);
    // console.log(minimized);
    // console.log(roundTrip);
  });
});
