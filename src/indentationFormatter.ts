import { CompleteFormatOptions } from './formatter';

export class IndentationFormatter {
  private opt: CompleteFormatOptions;
  private lines: string[] = [];
  private indentLevel = 0;

  constructor(options: CompleteFormatOptions) {
    this.opt = options;
  }

  increment(): void {
    this.indentLevel += this.opt.indentSize;
  }

  decrement(): void {
    this.indentLevel -= this.opt.indentSize;
  }

  appendNewLine(value: string): void {
    const indent = ' '.repeat(this.indentLevel);
    this.lines.push(`${indent}${value}`);
  }

  appendPreviousLine(value: string): void {
    this.lines[this.lines.length - 1] += value;
  }

  alignAttributes(attributes: string[]): void {
    if (attributes.length === 0) {
      return;
    }

    const lastLine = this.lines[this.lines.length - 1];
    const attrLen = attributes.reduce((acc, s) => acc + s.length + 1, 0);
    const totalUnwrappedLen = lastLine.length + attrLen;

    if (totalUnwrappedLen <= this.opt.lineWrapWidth) {
      this.lines[this.lines.length - 1] += attributes.join(' ');
      return;
    }

    const sep = ' '.repeat(lastLine.length);
    this.lines[this.lines.length - 1] += attributes[0];
    for (let i = 1; i < attributes.length; ++i) {
      this.lines.push(`${sep}${attributes[i]}`);
    }
  }

  length(): number {
    return this.lines.reduce((acc, s) => acc + s.length, 0);
  }

  toString(): string {
    return this.lines.join(this.opt.newlineChar);
  }
}
