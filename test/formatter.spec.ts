import { readFileSync } from 'fs';
import { formatXml, minifyXml } from '../src/formatter';

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

    const formatResult = formatXml(data);

    const windowsFriendly = data.replace(/\r/g, '').trim();

    expect(formatResult.succeeded).toBe(true);
    expect(formatResult.formatted).toEqual(windowsFriendly);
  });

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

    const formattedResult = formatXml(data);
    const minimizedResult = minifyXml(data, { removeComments: false });
    expect(minimizedResult).toBeDefined();
    if (minimizedResult === undefined) return;

    expect(minimizedResult.succeeded).toBe(true);
    const roundTrip = formatXml(minimizedResult.formatted);
    expect(formattedResult.formatted).toEqual(roundTrip.formatted);

    // console.log(formatted);
    // console.log(minimized);
    // console.log(roundTrip);
  });
});

describe('InvalidData', () => {
  it('should minimize up to the invalid token', () => {
    const input = readFileSync('./test/resources/invalidInput.xml', 'utf-8');
    const expectation = readFileSync(
      './test/resources/invalidInput_minimized.xml',
      'utf-8'
    );

    const minimizedResult = minifyXml(input, { removeComments: false });
    //console.log(minimizedResult);
    //const m = minimizedResult;
    //console.log(m.formatted.substring(m.validationErrorIndex!));
    expect(minimizedResult.formatted).toEqual(expectation);
  });
});

describe('respects single space in w:t', () => {
  const data = readFileSync(
    './test/resources/withSpaceOnlySpacePreserve.xml',
    'utf-8'
  );
  const formattedResult = formatXml(data);
  expect(formattedResult.formatted).toContain('<w:t xml:space="preserve">');
  expect(formattedResult.formatted).not.toContain(
    '<w:t xml:space="preserve">\n'
  );
});

describe('respects empty w:t with space preserve', () => {
  const data = readFileSync(
    './test/resources/withEmptySpacePreserve.xml',
    'utf-8'
  );
  const formattedResult = formatXml(data);
  expect(formattedResult.formatted).toContain(
    '<w:t xml:space="preserve"></w:t>'
  );
  expect(formattedResult.formatted).toContain('<w:t>space</w:t>');
});
