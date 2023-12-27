import { StringView } from './stringView';
import {
  SubToken,
  SubTokenType as SubtokenType,
  buildSubToken,
} from './subtoken';
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
  ParseValue,
  ValidationError,
  isValidationError,
  EndOfFile,
  isEndOfFile,
  ParseState,
} from './result';
import { isValidXmlNameChar, isWhitespace } from './xmlCharacters';

export class Tokenizer {
  private state: ParseState;
  private readonly nameStack: string[] = [];

  constructor(source: string) {
    this.state = new ParseState(source, 0);
  }

  private validateTagNames(token: Token, state: ParseState): Result<Token> {
    switch (token.type) {
      case TokenType.OpenTag: {
        this.nameStack.push(token.name.toString());
        break;
      }

      case TokenType.ClosingTag: {
        const name = token.name;
        const last = this.nameStack.pop();
        if (last === undefined) {
          return new ValidationError<Token>(
            `unexpected closing tag: ${name.toString()}`
          );
        }
        if (!name.equals(last)) {
          return new ValidationError<Token>(
            `unexpected tag name: ${name.toString()} (expected ${last.toString()})`
          );
        }
        break;
      }
    }

    return new ParseValue(token, state);
  }

  private updateState(token: Token, state: ParseState): Result<Token> {
    this.state = state;
    return new ParseValue(token, state);
  }

  private getNext(): Result<Token> {
    return getNextToken(this.state)
      .then(this.validateTagNames.bind(this))
      .then(this.updateState.bind(this));
  }

  *[Symbol.iterator](): Iterator<ParseValue<Token> | ValidationError<Token>> {
    while (true) {
      const res = this.getNext();
      if (isEndOfFile(res)) {
        return;
      }

      yield res;
    }
  }
}

const getNextToken = (state: ParseState): Result<Token> => {
  return getNextStartSubToken(state).then(({ type, view }, state) => {
    switch (type) {
      case SubtokenType.Text: {
        const token = buildBasicToken(TokenType.Text, view);
        return new ParseValue(token, state);
      }

      case SubtokenType.PrologueStart: {
        return getNextEndSubToken(state, SubtokenType.PrologueEnd).then(
          (endSubtoken, state) => {
            const cominedView = view.combine(endSubtoken.view);
            const token = buildBasicToken(TokenType.Prologue, cominedView);
            return new ParseValue(token, state);
          }
        );
      }

      case SubtokenType.CommentStart: {
        return getNextEndSubToken(state, SubtokenType.CommentEnd).then(
          (endSubtoken, state) => {
            const cominedView = view.combine(endSubtoken.view);
            const token = buildBasicToken(TokenType.Comment, cominedView);
            return new ParseValue(token, state);
          }
        );
      }

      case SubtokenType.CDataStart: {
        return getNextEndSubToken(state, SubtokenType.CDataEnd).then(
          (endSubtoken, state) => {
            const cominedView = view.combine(endSubtoken.view);
            const token = buildBasicToken(TokenType.CData, cominedView);
            return new ParseValue(token, state);
          }
        );
      }

      case SubtokenType.OpenTagStart: {
        return readName(state).then((name, state) =>
          readAttributes(state).then((attrs, state) =>
            getNextEndTagSubToken(state).then((endSubtoken, state) => {
              const totalView = view.combine(endSubtoken.view);
              const index = totalView.getEnd();

              let token: Token;
              if (endSubtoken.type === SubtokenType.SelfClosingTagEnd) {
                token = buildSelfClosingTagToken(totalView, name, attrs);
              } else if (endSubtoken.type === SubtokenType.TagEnd) {
                token = buildOpenTagToken(totalView, name, attrs);
              } else {
                return new ValidationError('unexpected token');
              }

              return new ParseValue(token, state.with(index));
            })
          )
        );
      }

      case SubtokenType.ClosingTagStart: {
        return readName(state).then((name, state) =>
          getNextEndSubToken(state, SubtokenType.TagEnd).then(
            (endToken, state) => {
              const totalView = view.combine(endToken.view);
              const token = buildClosingTagToken(totalView, name);
              return new ParseValue(token, state);
            }
          )
        );
      }

      default:
        return new ValidationError('unknown token');
    }
  });
};

const getNextStartSubToken = (state: ParseState): Result<SubToken> => {
  const originalState = state;

  return skipWhitespace(state).then((_, state) => {
    const { source, index } = state;

    if (source[index] != '<') {
      return readTextValue(originalState).then((text, state) => {
        const subtoken = buildSubToken(SubtokenType.Text, text);
        return new ParseValue(subtoken, state);
      });
    }

    if (index + 1 === source.length) {
      return new EndOfFile();
    }

    switch (source[index + 1]) {
      case '?': {
        const view = new StringView(source, index, index + 2);
        const subtoken = buildSubToken(SubtokenType.PrologueStart, view);
        const newState = state.with(view.getEnd());
        return new ParseValue(subtoken, newState);
      }

      case '/': {
        const view = new StringView(source, index, index + 2);
        const subtoken = buildSubToken(SubtokenType.ClosingTagStart, view);
        const newState = state.with(view.getEnd());
        return new ParseValue(subtoken, newState);
      }

      case '!':
        if (source.startsWith('<!--', index)) {
          const view = new StringView(source, index, index + 4);
          const subtoken = buildSubToken(SubtokenType.CommentStart, view);
          const newState = state.with(view.getEnd());
          return new ParseValue(subtoken, newState);
        }
        if (source.startsWith('<![CDATA[', index)) {
          const view = new StringView(source, index, index + 9);
          const subtoken = buildSubToken(SubtokenType.CDataStart, view);
          const newState = state.with(view.getEnd());
          return new ParseValue(subtoken, newState);
        }
        return new ValidationError(
          `unexpected character ${source[index + 1]}`,
          index + 1
        );

      default: {
        const view = new StringView(source, index, index + 1);
        const subtoken = buildSubToken(SubtokenType.OpenTagStart, view);
        const newState = state.with(view.getEnd());
        return new ParseValue(subtoken, newState);
      }
    }
  });
};

const readTextValue = (state: ParseState): Result<StringView> => {
  const { source, index } = state;
  const endIndex = indexOfAny(source, index, ['<', '>']);

  if (endIndex === -1) {
    return new ValidationError('unexpected end of file');
  }
  if (source[endIndex] !== '<') {
    return new ValidationError('unexpected character', endIndex);
  }

  const view = new StringView(source, index, endIndex);
  return new ParseValue(view, state.with(endIndex));
};

type EndSubtoken =
  | SubtokenType.PrologueEnd
  | SubtokenType.CommentEnd
  | SubtokenType.CDataEnd
  | SubtokenType.TagEnd;

const endSubTokenMap: { [key in EndSubtoken]: string } = {
  [SubtokenType.PrologueEnd]: '?>',
  [SubtokenType.CommentEnd]: '-->',
  [SubtokenType.CDataEnd]: ']]>',
  [SubtokenType.TagEnd]: '>',
};

const getNextEndSubToken = (
  state: ParseState,
  type: EndSubtoken
): Result<SubToken> => {
  const value = endSubTokenMap[type];
  const { source, index } = state;

  const endIndex = indexOfAny(source, index, ['<', '>']);
  if (endIndex === -1) {
    return new ValidationError(`could not complete token ${type}`);
  }

  const startIndex = endIndex - value.length + 1;
  const view = new StringView(source, startIndex, endIndex + 1);
  if (!view.equals(value)) {
    return new ValidationError(`could not complete token ${type}`, endIndex);
  }

  const subtoken = buildSubToken(type, view);
  const newState = state.with(view.getEnd());
  return new ParseValue(subtoken, newState);
};

const getNextEndTagSubToken = (state: ParseState): Result<SubToken> => {
  return getNextEndSubToken(state, SubtokenType.TagEnd).then(
    (subtoken, state) => {
      const { source, index } = state;
      if (source[index - 2] === '/') {
        subtoken = buildSubToken(SubtokenType.SelfClosingTagEnd, subtoken.view);
      }

      return new ParseValue(subtoken, state);
    }
  );
};

const readName = (state: ParseState): Result<StringView> =>
  tryReadName(state).then((name, state) => {
    if (name === null) {
      return new ValidationError('expected a valid xml name');
    }
    return new ParseValue(name, state);
  });

const tryReadName = (state: ParseState): Result<StringView | null> =>
  skipWhitespace(state).then((_, state) => {
    const { source, index: start } = state;
    let { index } = state;

    while (index < source.length && isValidXmlNameChar(source[index])) {
      ++index;
    }

    if (index === start) {
      return new ParseValue(null, state);
    }

    const c = source[index];
    if (!(isWhitespace(c) || ['>', '/', '='].includes(c))) {
      return new ValidationError(`invalid character in name: ${c}`, index);
    }

    const view = new StringView(source, start, index);
    return new ParseValue(view, state.with(index));
  });

const readAttributes = (state: ParseState): Result<StringView[]> => {
  const attributes: StringView[] = [];
  let res = tryReadAttribute(state);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (isEndOfFile(res)) {
      return new ValidationError('unexpected end of file');
    }

    if (isValidationError(res)) {
      return res.As<StringView[]>();
    }

    const attr = res.value;

    if (attr === null) {
      return new ParseValue(attributes, res.state);
    }

    attributes.push(attr);
    res = tryReadAttribute(res.state);
  }
};

const tryReadAttribute = (state: ParseState): Result<StringView | null> =>
  tryReadName(state).then((name, { source, index }) => {
    if (name === null) {
      return new ParseValue(null, state);
    }

    if (index + 3 >= source.length) {
      return new ValidationError('unexpected end of file');
    }

    if (source[index] !== '=') {
      return new ValidationError('expected an equal sign', index);
    }
    ++index;

    if (source[index] !== '"') {
      return new ValidationError('expected quotation mark', index);
    }
    ++index;

    const end = indexOfAny(source, index, ['"', '<', '>']);
    if (end === -1 || source[end] != '"') {
      return new ValidationError('expected closing quotation mark', index);
    }

    const view = new StringView(source, name.getStart(), end + 1);
    return new ParseValue(view, state.with(end + 1));
  });

const skipWhitespace = ({ source, index }: ParseState): Result<void> => {
  while (index < source.length && isWhitespace(source[index])) {
    ++index;
  }

  return index === source.length
    ? new EndOfFile()
    : new ParseValue(undefined, new ParseState(source, index));
};

const indexOfAny = (
  source: string,
  startIndex: number,
  chars: string[]
): number => {
  let index = startIndex;
  while (index < source.length) {
    if (chars.includes(source[index])) {
      return index;
    }
    ++index;
  }
  return -1;
};
