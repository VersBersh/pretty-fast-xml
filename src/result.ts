type Value<T> = T | ValidationError | EndOfFile;

/*****************
 * End Of File
 *****************/
export const EndOfFile = Symbol('EndOfFile');
export type EndOfFile = typeof EndOfFile;

export function isEndOfFile<T>(test: Value<T>): test is EndOfFile {
  return test === EndOfFile;
}

/******************
 * ValidationError
 ******************/
export interface ValidationError {
  source: string;
  index: number;
}

export function isValidationError<T>(test: Value<T>): test is ValidationError {
  return (
    typeof test === 'object' &&
    test !== null &&
    'source' in test &&
    'index' in test
  );
}

export const buildValidationError = (
  source: string,
  index: number
): ValidationError => ({
  source: source,
  index: index,
});

/******************
 * Result<T>
 ******************/

interface IResult<T> {
  then<U>(func: (val: T) => Result<U>): Result<U>;
}

export class ErrorResult<T> implements IResult<T> {
  public value: ValidationError | EndOfFile;

  constructor(value: ValidationError | EndOfFile) {
    this.value = value;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  then<U>(_: (val: T) => Result<U>): Result<U> {
    return new ErrorResult<U>(this.value);
  }

  As<U>(): Result<U> {
    return new ErrorResult<U>(this.value);
  }
}

export class ValueResult<T> implements IResult<T> {
  public value: T;

  constructor(value: T) {
    this.value = value;
  }

  then<U>(func: (val: T) => Result<U>): Result<U> {
    const res = func(this.value);
    if (isEndOfFile(res.value) || isValidationError(res.value)) {
      return new ErrorResult(res.value);
    }
    return new ValueResult<U>(res.value);
  }
}

export type Result<T> = ValueResult<T> | ErrorResult<T>;
