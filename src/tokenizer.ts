import { StringView } from './stringView';
import { SubToken, SubTokenType, buildSubToken } from './subtoken';
import {
  TokenType,
  Token,
  buildBasicToken,
  buildSelfClosingTagToken,
  buildOpenTagToken,
  buildClosingTagToken,
} from './token';
import {
  Result,
  ValueResult,
  ErrorResult,
  EndOfFile,
  isEndOfFile,
  isValidationError,
  buildValidationError,
} from './result';

export class Tokenizer {
  private readonly _source: string;
  private _index = 0;
  private readonly _tagStack: StringView[] = [];

  constructor(source: string) {
    this._source = source;
  }

  getRemaining(): string {
    const res = this._source.substring(this._index);
    this._index = this._source.length;
    return res;
  }

  getTokens(): Result<Token[]> {
    const tokens: Token[] = [];
    let res = this.getNextToken();
    while (!isEndOfFile(res.value)) {
      if (isValidationError(res.value)) {
        return new ErrorResult(res.value);
      }

      tokens.push(res.value);
      res = this.getNextToken();
    }
    return new ValueResult(tokens);
  }

  getNextToken(): Result<Token> {
    return this.getNextStartSubToken().then(token => {
      const { type, view } = token;

      switch (type) {
        case SubTokenType.Text: {
          return new ValueResult(buildBasicToken(TokenType.Text, view));
        }

        case SubTokenType.PrologueStart: {
          return this.getNextEndSubToken(SubTokenType.PrologueEnd).then(
            endToken =>
              new ValueResult(
                buildBasicToken(TokenType.Prologue, view.combine(endToken.view))
              )
          );
        }

        case SubTokenType.CommentStart: {
          return this.getNextEndSubToken(SubTokenType.CommentEnd).then(
            endToken =>
              new ValueResult(
                buildBasicToken(TokenType.Comment, view.combine(endToken.view))
              )
          );
        }

        case SubTokenType.CDataStart: {
          return this.getNextEndSubToken(SubTokenType.CDataEnd).then(
            endToken =>
              new ValueResult(
                buildBasicToken(TokenType.CData, view.combine(endToken.view))
              )
          );
        }

        case SubTokenType.OpenTagStart: {
          const name = this.readName();
          return this.readAttributes().then(attrs =>
            this.getNextEndTagSubToken().then(endToken => {
              const totalView = view.combine(endToken.view);
              if (endToken.type === SubTokenType.SelfClosingTagEnd) {
                return new ValueResult(
                  buildSelfClosingTagToken(totalView, name, attrs)
                );
              }

              this._tagStack.push(name);
              return new ValueResult(buildOpenTagToken(totalView, name, attrs));
            })
          );
        }

        case SubTokenType.ClosingTagStart: {
          const name = this.readName();
          const last = this._tagStack.pop();
          if (last === undefined || name.toString() !== last.toString()) {
            return this.validationError();
          }

          return this.getNextEndSubToken(SubTokenType.TagEnd).then(endToken => {
            const totalView = view.combine(endToken.view);
            return new ValueResult(buildClosingTagToken(totalView, name));
          });
        }

        default:
          return this.validationError();
      }
    });
  }

  private getNextStartSubToken(): Result<SubToken> {
    return Tokenizer.getNextStartSubTokenCore(this._source, this._index).then(
      token => {
        this._index = token.view.getEnd();
        return new ValueResult(token);
      }
    );
  }

  private static getNextStartSubTokenCore(
    source: string,
    index: number
  ): Result<SubToken> {
    const originalIndex = index;

    while (this.isWhitespace(source[index])) {
      ++index;
    }

    if (index == source.length) {
      return new ErrorResult(EndOfFile);
    }

    if (source[index] != '<') {
      const text = this.readUntilStartMarker(source, originalIndex);
      const subtoken = buildSubToken(SubTokenType.Text, text);
      return new ValueResult(subtoken);
    }

    switch (source[index + 1]) {
      case '?': {
        const view = new StringView(source, index, index + 2);
        const subtoken = buildSubToken(SubTokenType.PrologueStart, view);
        return new ValueResult(subtoken);
      }

      case '/': {
        const view = new StringView(source, index, index + 2);
        const subtoken = buildSubToken(SubTokenType.ClosingTagStart, view);
        return new ValueResult(subtoken);
      }

      case '!':
        if (source.startsWith('<!--', index)) {
          const view = new StringView(source, index, index + 4);
          const subtoken = buildSubToken(SubTokenType.CommentStart, view);
          return new ValueResult(subtoken);
        }
        if (source.startsWith('<![CDATA[', index)) {
          const view = new StringView(source, index, index + 9);
          const subtoken = buildSubToken(SubTokenType.CDataStart, view);
          return new ValueResult(subtoken);
        }
        return new ErrorResult(buildValidationError(source, index));

      default: {
        const view = new StringView(source, index, index + 1);
        const subtoken = buildSubToken(SubTokenType.OpenTagStart, view);
        return new ValueResult(subtoken);
      }
    }
  }

  private static readUntilStartMarker(
    source: string,
    index: number
  ): StringView {
    const end = source.indexOf('<', index);
    return end === -1
      ? new StringView(source, index, source.length)
      : new StringView(source, index, end);
  }

  private static readonly _endSubTokens: { [key in SubTokenType]?: string } = {
    [SubTokenType.PrologueEnd]: '?>',
    [SubTokenType.CommentEnd]: '-->',
    [SubTokenType.CDataEnd]: ']]>',
    [SubTokenType.TagEnd]: '>',
  };

  private getNextEndSubToken(type: SubTokenType): Result<SubToken> {
    return Tokenizer.getNextEndSubTokenCore(
      this._source,
      this._index,
      type
    ).then(token => {
      this._index = token.view.getEnd();
      return new ValueResult(token);
    });
  }

  private static getNextEndSubTokenCore(
    source: string,
    index: number,
    type: SubTokenType
  ): Result<SubToken> {
    const value = this._endSubTokens[type];
    if (value === undefined) {
      return new ErrorResult(buildValidationError(source, index));
    }

    const end = source.indexOf(value, index);
    if (end === undefined) {
      return new ErrorResult(buildValidationError(source, index));
    }

    const view = new StringView(source, index, end + value.length);
    const subtoken = buildSubToken(type, view);
    return new ValueResult(subtoken);
  }

  private getNextEndTagSubToken(): Result<SubToken> {
    return this.getNextEndSubToken(SubTokenType.TagEnd).then(token => {
      const subtoken =
        this._source[this._index - 2] == '/'
          ? buildSubToken(SubTokenType.SelfClosingTagEnd, token.view)
          : token;

      return new ValueResult(subtoken);
    });
  }

  private readName(): StringView {
    while (Tokenizer.isWhitespace(this._source[this._index])) {
      ++this._index;
    }

    const start = this._index;
    while (Tokenizer.isValidXmlNameChar(this._source[this._index])) {
      ++this._index;
    }

    return new StringView(this._source, start, this._index);
  }

  private readAttributes(): Result<StringView[]> {
    const attributes: StringView[] = [];

    let res = this.readAttribute();
    while (!isEndOfFile(res.value)) {
      if (isValidationError(res.value)) {
        return new ErrorResult(res.value);
      }
      attributes.push(res.value);
      res = this.readAttribute();
    }
    return new ValueResult(attributes);
  }

  private readAttribute(): Result<StringView> {
    const name = this.readName();

    if (name.isEmpty()) {
      return new ErrorResult(EndOfFile);
    }

    if (this._source[this._index++] !== '=') {
      return this.validationError();
    }

    if (this._source[this._index++] !== '"') {
      return this.validationError();
    }

    const end = this._source.indexOf('"', this._index);
    if (end === -1) {
      return this.validationError();
    }

    this._index = end + 1;
    const view = new StringView(this._source, name.getStart(), this._index);
    return new ValueResult(view);
  }

  validationError<T>(): ErrorResult<T> {
    return new ErrorResult<T>(buildValidationError(this._source, this._index));
  }

  private static _specialsChars = ['_', '.', '-', ':'];

  private static isValidXmlNameChar(char: string): boolean {
    return (
      this.isDigit(char) ||
      this.isAscii(char) ||
      this._specialsChars.includes(char)
    );
  }

  private static isDigit(char: string): boolean {
    const c = char.charCodeAt(0);
    return 48 <= c && c < 58;
  }

  private static isAscii(char: string): boolean {
    const c = char.charCodeAt(0);
    return (65 <= c && c < 91) || (97 <= c && c < 123);
  }

  private static readonly _whitespaces = [' ', '\t', '\r', '\n'];
  private static isWhitespace(char: string): boolean {
    return this._whitespaces.includes(char);
  }
}
