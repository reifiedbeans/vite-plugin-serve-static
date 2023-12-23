export type ResolveFn = (match: RegExpExecArray) => string;

export type Config = {
  readonly pattern: RegExp;
  readonly resolve: string | ResolveFn;
}[];
