export class ParseState {
  source: string;
  index: number;

  constructor(source: string, index: number) {
    this.source = source;
    this.index = index;
  }

  with(index: number): ParseState {
    return new ParseState(this.source, index);
  }

  end(): ParseState {
    return new ParseState(this.source, this.source.length);
  }
}

export type Result<T> = ParseValue<T> | ValidationError<T> | EndOfFile<T>;

interface ResultMonad<T> {
  then: (func: (val: T, state: ParseState) => Result<T>) => Result<T>;
}

/*****************
 * End Of File
 *****************/

const EndOfFileSymbol = Symbol('EndOfFile');

export class EndOfFile<T> implements ResultMonad<T> {
  public value = EndOfFileSymbol;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  then<U>(_: (val: T, state: ParseState) => Result<U>): EndOfFile<U> {
    return new EndOfFile<U>();
  }
}

export function isEndOfFile<T>(test: Result<T>): test is EndOfFile<T> {
  return test.value === EndOfFileSymbol;
}

/******************
 * ValidationError
 ******************/

export class ValidationError<T> implements ResultMonad<T> {
  public description: string;
  public value: number;

  constructor(description: string, index = -1) {
    this.description = description;
    this.value = index;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  then<U>(_: (val: T, state: ParseState) => Result<U>): ValidationError<U> {
    return new ValidationError<U>(this.description, this.value);
  }

  As<U>(): ValidationError<U> {
    return new ValidationError<U>(this.description, this.value);
  }
}

export function isValidationError<T>(
  test: Result<T>
): test is ValidationError<T> {
  return typeof test === 'object' && test !== null && 'description' in test;
}

/******************
 * ParseValue<T>
 ******************/

export class ParseValue<T> implements ResultMonad<T> {
  public value: T;
  public state: ParseState;

  constructor(value: T, state: ParseState) {
    this.value = value;
    this.state = state;
  }

  public static From<U>(value: U, state: ParseState): ParseValue<U> {
    return new ParseValue(value, state);
  }

  then<U>(func: (val: T, state: ParseState) => Result<U>): Result<U> {
    return func(this.value, this.state);
  }
}

export function isParseValue<T>(test: Result<T>): test is ParseValue<T> {
  return typeof test === 'object' && test !== null && 'state' in test;
}
