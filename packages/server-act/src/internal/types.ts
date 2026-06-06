import type { StandardSchemaV1 } from "@standard-schema/spec";

type Primitive = bigint | boolean | null | number | string | symbol | undefined;

export type InferParserType<
  T,
  TType extends "in" | "out",
> = T extends StandardSchemaV1
  ? TType extends "in"
    ? StandardSchemaV1.InferInput<T>
    : StandardSchemaV1.InferOutput<T>
  : never;

type IsAny<T> = 0 extends 1 & T ? true : false;

type JoinPath<
  TPrefix extends string,
  TSuffix extends string,
> = `${TPrefix}.${TSuffix}`;

type DotPath<T> =
  IsAny<T> extends true
    ? string
    : unknown extends T
      ? string
      : T extends Primitive | Date | File | Blob | FormData | Function
        ? never
        : T extends readonly (infer TItem)[]
          ? `${number}` | JoinPath<`${number}`, DotPath<TItem>>
          : T extends object
            ? string extends keyof T
              ? string
              : {
                  [TKey in keyof T & string]:
                    | TKey
                    | (DotPath<T[TKey]> extends never
                        ? never
                        : JoinPath<TKey, DotPath<T[TKey]>>);
                }[keyof T & string]
            : string;

export type InputErrors<TShape> = {
  messages: string[];
  fieldErrors: Partial<Record<DotPath<TShape>, string[]>>;
};
