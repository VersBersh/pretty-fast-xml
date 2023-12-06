import { StringView } from './stringView';

export class StringBuilder {
  private _values: string[];

  constructor(capacity: number) {
    this._values = new Array<string>(capacity);
  }

  append(value: string): void {
    this._values.push(value);
  }

  appendView(view: StringView): void {
    this._values.push(view.toString());
  }

  pop(): string | undefined {
    return this._values.pop();
  }

  toString(): string {
    return this._values.join('');
  }
}
