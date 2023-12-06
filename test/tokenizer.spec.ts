import { readFileSync } from 'fs';
import { Tokenizer } from '../src/tokenizer';
import { Token } from '../src/token';

describe('StringView', () => {
  it.each([
    ['withPrologue', 5],
    ['withComment', 6],
    ['withCDATA', 4],
    ['withText', 6],
    ['withSpacePreserve', 6],
  ])('should parse', (resourceName, count) => {
    const path = `./test/resources/${resourceName}.xml`;
    const data = readFileSync(path, 'utf-8');

    const tokenizer = new Tokenizer(data);
    const tokens = tokenizer.getTokens().value as Token[];
    expect(tokens).toBeDefined();
    expect(tokens).toHaveLength(count);

    //console.log(tokens.map(t => t.view.toString()));
  });

  it('should parse within 1s', () => {
    const path = './test/resources/largeInput.xml';
    const data = readFileSync(path, 'utf-8');

    const startTime = Date.now();
    const tokenizer = new Tokenizer(data);
    const tokens = tokenizer.getTokens().value as Token[];
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    expect(tokens).toBeDefined();
    expect(executionTime).toBeLessThan(1000);
  });
});
