import { ValidationError, isValidationError } from './result';
import { IndentationFormatter } from './indentationFormatter';
import { OpenTagToken, SelfClosingTagToken, Token, TokenType } from './token';
import { Tokenizer } from './tokenizer';

export interface FormatResult {
  succeeded: boolean;
  formatted: string;
  validationErrorDescription?: string;
  validationErrorIndex?: number;
}

export interface FormatOptions {
  indentSize?: number;
  lineWrapWidth?: number;
  newlineChar?: string;
  removeComments?: boolean;
}

export interface CompleteFormatOptions {
  indentSize: number;
  lineWrapWidth: number;
  newlineChar: string;
  removeComments: boolean;
}

const minifyXmlDefaultOptions: CompleteFormatOptions = {
  newlineChar: '',
  lineWrapWidth: Infinity,
  indentSize: 0,
  removeComments: true,
};

const formatXmlDefaultOptions: CompleteFormatOptions = {
  newlineChar: '\n',
  lineWrapWidth: 150,
  indentSize: 2,
  removeComments: false,
};

export const minifyXml = (
  rawXml: string,
  options?: FormatOptions
): FormatResult => {
  options = { ...minifyXmlDefaultOptions, ...options };
  return formatXml(rawXml, options);
};

export const formatXml = (
  rawXml: string,
  options?: FormatOptions
): FormatResult => {
  const opt: CompleteFormatOptions = { ...formatXmlDefaultOptions, ...options };
  const fmt = new IndentationFormatter(opt);
  const tokenizer = new Tokenizer(rawXml);

  let prevToken: Token | null = null;
  let preserveWhitespace = false;

  for (const result of tokenizer) {
    if (isValidationError(result)) {
      return handleValidationError(result, rawXml, fmt, prevToken);
    }

    const token = result.value;

    switch (token.type) {
      case TokenType.Prologue:
      case TokenType.CData:
        fmt.appendNewLine(token.view.toString());
        break;

      case TokenType.Comment:
        if (opt.removeComments) {
          break;
        }
        fmt.appendNewLine(token.view.toString());
        break;

      case TokenType.OpenTag:
        formatTag(token, fmt);
        fmt.increment();
        preserveWhitespace = token.attributes.some(a =>
          a.equals('xml:space="preserve"')
        );
        break;

      case TokenType.SelfClosingTag:
        formatTag(token, fmt);
        preserveWhitespace = false;
        break;

      case TokenType.ClosingTag:
        fmt.decrement();
        if (prevToken?.type === TokenType.Text) {
          fmt.appendPreviousLine(token.view.toString());
        } else {
          fmt.appendNewLine(token.view.toString());
        }
        preserveWhitespace = false;
        break;

      case TokenType.Text: {
        let text = token.view.toString();
        if (!preserveWhitespace) {
          text = text.trim();
        }
        fmt.appendPreviousLine(text);
        break;
      }
    }

    prevToken = token;
  }

  return {
    succeeded: true,
    formatted: fmt.toString(),
  };
};

const formatTag = (
  tag: OpenTagToken | SelfClosingTagToken,
  fmt: IndentationFormatter
): void => {
  const name = tag.name.toString();
  const attrs = tag.attributes.map(a => a.toString());
  const close = tag.type == TokenType.OpenTag ? '>' : '/>';

  if (attrs.length === 0) {
    fmt.appendNewLine(`<${name}${close}`);
    return;
  }

  fmt.appendNewLine(`<${name} `);
  fmt.alignAttributes(attrs);
  fmt.appendPreviousLine(close);
};

const handleValidationError = (
  error: ValidationError<Token>,
  source: string,
  fmt: IndentationFormatter,
  prevToken: Token | null
): FormatResult => {
  const currentLen = fmt.length();
  const lastGoodIndex = prevToken?.view.getEnd() ?? 0;
  const remaining = source.substring(lastGoodIndex);
  fmt.appendPreviousLine(remaining);
  return {
    succeeded: false,
    formatted: fmt.toString(),
    validationErrorDescription: error.description,
    validationErrorIndex: currentLen + Math.max(0, error.value - lastGoodIndex),
  };
};
