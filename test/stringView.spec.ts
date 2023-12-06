import { StringView } from '../src/stringView';

describe('StringView', () => {
  it.each([
    [1, 2],
    [1, 5],
    [6, 8],
  ])('substring (%i, %i)', (i, j) => {
    const message = 'Foo bar baz';
    const actual = new StringView(message, i, j).toString();
    const expected = message.substring(i, j);
    expect(actual).toMatch(expected);
  });
});
