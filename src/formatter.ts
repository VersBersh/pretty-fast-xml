import { isEndOfFile, isValidationError } from './result';
import { StringBuilder } from './stringBuilder';
import { OpenTagToken, SelfClosingTagToken, TokenType } from './token';
import { Tokenizer } from './tokenizer';

export interface formatOptions {
  indentSize?: number;
  newlineChar?: string;
  removeComments?: boolean;
}

interface completeFormatOptions {
  indentSize: number;
  newlineChar: string;
  removeComments: boolean;
}

const minimizeXmlDefaultOptions: completeFormatOptions = {
  newlineChar: '',
  indentSize: 0,
  removeComments: true,
};

const formatXmlDefaultOptions: completeFormatOptions = {
  newlineChar: '\n',
  indentSize: 2,
  removeComments: false,
};

export const minimizeXml = (
  rawXml: string,
  options?: formatOptions
): string | undefined => {
  options = { ...minimizeXmlDefaultOptions, ...options };
  return formatXml(rawXml, options);
};

export const formatXml = (rawXml: string, options?: formatOptions): string => {
  const opt: completeFormatOptions = { ...formatXmlDefaultOptions, ...options };

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
      case TokenType.CData:
        sb.append(' '.repeat(indentLevel));
        sb.appendView(token.view);
        sb.append(opt.newlineChar);
        break;

      case TokenType.Comment:
        if (opt.removeComments) {
          break;
        }
        sb.append(' '.repeat(indentLevel));
        sb.appendView(token.view);
        sb.append(opt.newlineChar);
        break;

      case TokenType.OpenTag:
        sb.append(' '.repeat(indentLevel));
        sb.append(formatTag(token, indentLevel));
        indentLevel += opt.indentSize;
        sb.append(opt.newlineChar);
        preserveWhitespace = token.attributes.some(a =>
          a.equals('xml:space="preserve"')
        );
        break;

      case TokenType.SelfClosingTag:
        sb.append(' '.repeat(indentLevel));
        sb.append(formatTag(token, indentLevel));
        sb.append(opt.newlineChar);
        preserveWhitespace = false;
        break;

      case TokenType.ClosingTag:
        indentLevel -= opt.indentSize;
        sb.append(' '.repeat(indentLevel));
        sb.appendView(token.view);
        sb.append(opt.newlineChar);
        preserveWhitespace = false;
        break;

      case TokenType.Text: {
        sb.pop(); // pop last new line
        indentLevel -= opt.indentSize; // remove the last indent step
        let text = token.view.toString();
        if (!preserveWhitespace) text = text.trim();
        sb.append(text);

        const closeTag = tokenizer.getNextToken();
        if (isEndOfFile(closeTag.value) || isValidationError(closeTag.value)) {
          sb.append(tokenizer.getRemaining());
          return sb.toString();
        }
        sb.appendView(closeTag.value.view);
        sb.append(opt.newlineChar);
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
