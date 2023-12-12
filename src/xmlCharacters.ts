const isDigit = (char: string): boolean => {
  const c = char.charCodeAt(0);
  return 48 <= c && c < 58;
};

const _whitespaces = [' ', '\t', '\r', '\n'];
export const isWhitespace = (char: string): boolean => {
  return _whitespaces.includes(char);
};

const startCharSpecial = [':', '_'];
const otherCharSpecial = ['-', '.', 0xb7];

// https://www.w3.org/TR/2008/REC-xml-20081126/#NT-Name
export const isValidXmlNameStartChar = (char: string): boolean => {
  const code = char.charCodeAt(0);

  return (
    ('a' <= char && char <= 'z') ||
    ('A' <= char && char <= 'Z') ||
    startCharSpecial.includes(char) ||
    (0xc0 <= code && code <= 0xd6) ||
    (0xd8 <= code && code <= 0xf6) ||
    (0xf8 <= code && code <= 0x2ff) ||
    (0x370 <= code && code <= 0x37d) ||
    (0x37f <= code && code <= 0x1fff) ||
    (0x200c <= code && code <= 0x200d) ||
    (0x2070 <= code && code <= 0x218f) ||
    (0x2c00 <= code && code <= 0x2fef) ||
    (0x3001 <= code && code <= 0xd7ff) ||
    (0xf900 <= code && code <= 0xfdcf) ||
    (0xfdf0 <= code && code <= 0xfffd) ||
    (0x10000 <= code && code <= 0xeffff)
  );
};

export const isValidXmlNameChar = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return (
    isValidXmlNameStartChar(char) ||
    isDigit(char) ||
    otherCharSpecial.includes(char) ||
    (0x0300 <= code && code <= 0x036f) ||
    (0x203f <= code && code <= 0x2040)
  );
};
