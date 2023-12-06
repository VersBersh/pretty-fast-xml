import { StringView } from './stringView';

export enum SubTokenType {
  PrologueStart,
  PrologueEnd,
  CDataStart,
  CDataEnd,
  CommentStart,
  CommentEnd,
  OpenTagStart,
  ClosingTagStart,
  TagEnd,
  SelfClosingTagEnd,
  Text,
}

export interface SubToken {
  type: SubTokenType;
  view: StringView;
}

export const buildSubToken = (
  type: SubTokenType,
  view: StringView
): SubToken => ({
  type: type,
  view: view,
});
