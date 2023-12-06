export class StringView {
  private _source: string;
  private _startIndex: number;
  private _endIndex: number;

  constructor(source: string, startIndex = 0, length = source.length) {
    this._source = source;
    this._startIndex = startIndex;
    this._endIndex = length;
  }

  getStart(): number {
    return this._startIndex;
  }

  getEnd(): number {
    return this._endIndex;
  }

  length(): number {
    return this._endIndex - this._startIndex;
  }

  isEmpty(): boolean {
    return this.length() === 0;
  }

  toString(): string {
    return this._source.substring(this._startIndex, this._endIndex);
  }

  equals(str: string): boolean {
    return (
      str.length === this.length() &&
      this._source.startsWith(str, this._startIndex)
    );
  }

  combine(other: StringView): StringView {
    return new StringView(this._source, this._startIndex, other._endIndex);
  }
}
