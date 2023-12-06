import { isEndOfFile, isValidationError } from './result';
import { StringBuilder } from './stringBuilder';
import { OpenTagToken, SelfClosingTagToken, TokenType } from './token';
import { Tokenizer } from './tokenizer';

export const minimizeXml = (rawXml: string): string | undefined => {
  return formatXml(rawXml, 0, '');
};

export const formatXml = (
  rawXml: string,
  indentStep = 2,
  newline = '\n'
): string => {
  const sb = new StringBuilder(Math.floor(rawXml.length / 100));
  const tokenizer = new Tokenizer(rawXml);

  let indentLevel = 0;
  let preserveWhitespace = false;
  let result = tokenizer.getNextToken();

  while (!isEndOfFile(result.value)) {
    if (isValidationError(result.value)) {
      sb.append(tokenizer.getRemaining());
      return sb.toString();
    }

    const token = result.value;

    switch (token.type) {
      case TokenType.Prologue:
      case TokenType.Comment:
      case TokenType.CData:
        sb.append(' '.repeat(indentLevel));
        sb.appendView(token.view);
        sb.append(newline);
        break;

      case TokenType.OpenTag:
        sb.append(' '.repeat(indentLevel));
        sb.append(formatTag(token, indentLevel));
        indentLevel += indentStep;
        sb.append(newline);
        preserveWhitespace = token.attributes.some(a =>
          a.equals('xml:space="preserve"')
        );
        break;

      case TokenType.SelfClosingTag:
        sb.append(' '.repeat(indentLevel));
        sb.append(formatTag(token, indentLevel));
        sb.append(newline);
        preserveWhitespace = false;
        break;

      case TokenType.ClosingTag:
        indentLevel -= indentStep;
        sb.append(' '.repeat(indentLevel));
        sb.appendView(token.view);
        sb.append(newline);
        preserveWhitespace = false;
        break;

      case TokenType.Text: {
        sb.pop(); // pop last new line
        indentLevel -= indentStep; // remove the last indent step
        let text = token.view.toString();
        if (!preserveWhitespace) text = text.trim();
        sb.append(text);

        const closeTag = tokenizer.getNextToken();
        if (isEndOfFile(closeTag.value) || isValidationError(closeTag.value)) {
          sb.append(tokenizer.getRemaining());
          return sb.toString();
        }
        sb.appendView(closeTag.value.view);
        sb.append(newline);
        preserveWhitespace = false;
        break;
      }
    }

    result = tokenizer.getNextToken();
  }

  sb.pop(); // the final newline
  return sb.toString();
};

const formatTag = (
  tag: OpenTagToken | SelfClosingTagToken,
  indentLevel: number
): string => {
  const name = tag.name.toString();
  const attrs = tag.attributes.map(a => a.toString());
  const close = tag.type == TokenType.OpenTag ? '>' : '/>';

  if (attrs.length === 0) {
    return `<${name}${close}`;
  }

  const indentOffset = 2 + name.length; // length of: '<' + name + ' '
  const attrLen =
    indentOffset + attrs.reduce((acc, val) => acc + val.length, 0);
  const joinString =
    attrLen < 150 ? ' ' : '\n' + ' '.repeat(indentLevel + indentOffset);
  const formattedAttrs = attrs.join(joinString);

  return `<${name} ${formattedAttrs}${close}`;
};
