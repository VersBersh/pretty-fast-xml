import { StringView } from './stringView';

export enum TokenType {
  Prologue,
  CData,
  Comment,
  OpenTag,
  SelfClosingTag,
  ClosingTag,
  Text,
}

export type Token =
  | BasicToken
  | OpenTagToken
  | SelfClosingTagToken
  | ClosingTagToken;

type SpecialToken =
  | TokenType.OpenTag
  | TokenType.SelfClosingTag
  | TokenType.ClosingTag;

export interface BasicToken {
  type: Exclude<TokenType, SpecialToken>;
  view: StringView;
}

export const buildBasicToken = (
  type: Exclude<TokenType, SpecialToken>,
  view: StringView
): Token => ({
  type: type,
  view: view,
});

export interface OpenTagToken {
  type: TokenType.OpenTag;
  view: StringView;
  name: StringView;
  attributes: StringView[];
}

export const buildOpenTagToken = (
  view: StringView,
  name: StringView,
  attributes: StringView[]
): Token => ({
  type: TokenType.OpenTag,
  view: view,
  name: name,
  attributes: attributes,
});

export interface SelfClosingTagToken {
  type: TokenType.SelfClosingTag;
  view: StringView;
  name: StringView;
  attributes: StringView[];
}

export const buildSelfClosingTagToken = (
  view: StringView,
  name: StringView,
  attributes: StringView[]
): Token => ({
  type: TokenType.SelfClosingTag,
  view: view,
  name: name,
  attributes: attributes,
});

export interface ClosingTagToken {
  type: TokenType.ClosingTag;
  view: StringView;
  name: StringView;
}

export const buildClosingTagToken = (
  view: StringView,
  name: StringView
): Token => ({
  type: TokenType.ClosingTag,
  view: view,
  name: name,
});
