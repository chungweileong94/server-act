import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  LegacyMiddlewareFunction,
  MiddlewareDef,
  UseMiddlewareFunction,
} from "./middleware";

const unsetMarker = Symbol("unsetMarker");
export type UnsetMarker = typeof unsetMarker;

type RemoveUnsetMarker<T> = T extends UnsetMarker ? undefined : T;

type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type Prettify<T> = {
  [P in keyof T]: T[P];
} & {};

type Primitive = bigint | boolean | null | number | string | symbol | undefined;

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

type NormalizeContext<T> =
  RemoveUnsetMarker<T> extends Record<string, unknown>
    ? RemoveUnsetMarker<T>
    : {};

// oxlint-disable-next-line typescript/no-explicit-any
type SanitizeFunctionParam<T extends (param: any) => any> = T extends (
  param: infer P,
) => infer R
  ? Equals<P, undefined> extends true
    ? () => R
    : Equals<P, P | undefined> extends true
      ? (param?: P) => R
      : (param: P) => R
  : never;

type InferParserType<T, TType extends "in" | "out"> = T extends StandardSchemaV1
  ? TType extends "in"
    ? StandardSchemaV1.InferInput<T>
    : StandardSchemaV1.InferOutput<T>
  : never;

type InferInputType<T, TType extends "in" | "out"> = T extends UnsetMarker
  ? undefined
  : InferParserType<T, TType>;

interface ActionParams<
  TInput = unknown,
  TContext = unknown,
  TInputErrorShape = unknown,
  TOutput = unknown,
> {
  _input: TInput;
  _context: TContext;
  _inputErrorShape: TInputErrorShape;
  _output: TOutput;
}

type ActionOutput<TOutput, TFallback> = TOutput extends UnsetMarker
  ? TFallback
  : InferInputType<TOutput, "out">;

type ActionHandlerOutput<TOutput, TFallback> = TOutput extends UnsetMarker
  ? TFallback
  : InferInputType<TOutput, "in">;

type StateAction<TParams extends ActionParams> =
  TParams["_output"] extends UnsetMarker
    ? <TState, TPrevState = UnsetMarker>(
        action: (
          params: Prettify<
            {
              ctx: NormalizeContext<TParams["_context"]>;
              prevState: RemoveUnsetMarker<TPrevState>;
              rawInput: InferInputType<TParams["_input"], "in">;
            } & (
              | {
                  input: InferInputType<TParams["_input"], "out">;
                  inputErrors?: undefined;
                }
              | {
                  input?: undefined;
                  inputErrors: InputErrors<TParams["_inputErrorShape"]>;
                }
            )
          >,
        ) => Promise<TState>,
      ) => (
        prevState: TState | RemoveUnsetMarker<TPrevState>,
        input: InferInputType<TParams["_input"], "in">,
      ) => Promise<TState | RemoveUnsetMarker<TPrevState>>
    : <TPrevState = UnsetMarker>(
        action: (
          params: Prettify<
            {
              ctx: NormalizeContext<TParams["_context"]>;
              prevState:
                | InferInputType<TParams["_output"], "out">
                | RemoveUnsetMarker<TPrevState>;
              rawInput: InferInputType<TParams["_input"], "in">;
            } & (
              | {
                  input: InferInputType<TParams["_input"], "out">;
                  inputErrors?: undefined;
                }
              | {
                  input?: undefined;
                  inputErrors: InputErrors<TParams["_inputErrorShape"]>;
                }
            )
          >,
        ) => Promise<InferInputType<TParams["_output"], "in">>,
      ) => (
        prevState:
          | InferInputType<TParams["_output"], "out">
          | RemoveUnsetMarker<TPrevState>,
        input: InferInputType<TParams["_input"], "in">,
      ) => Promise<
        | InferInputType<TParams["_output"], "out">
        | RemoveUnsetMarker<TPrevState>
      >;

export interface ActionBuilder<TParams extends ActionParams> {
  /**
   * Middleware allows you to run code before the action, its return value will pass as context to the action.
   *
   * Chaining multiple middlewares is possible, each middleware receives context from previous middlewares
   * and returns additional context that gets merged.
   *
   * @deprecated Use `.use()` instead.
   */
  middleware: <TNewContext>(
    middleware: LegacyMiddlewareFunction<
      NormalizeContext<TParams["_context"]>,
      TNewContext
    >,
  ) => ActionBuilder<{
    _input: TParams["_input"];
    _context: TParams["_context"] extends UnsetMarker
      ? TNewContext
      : Prettify<TParams["_context"] & TNewContext>;
    _inputErrorShape: TParams["_inputErrorShape"];
    _output: TParams["_output"];
  }>;
  /**
   * Registers middleware in the action pipeline.
   * Call `next()` to continue, optionally passing `ctx` to merge additional
   * context for downstream middleware and the action handler.
   */
  use: <TNextContext extends Record<string, unknown>>(
    middleware: UseMiddlewareFunction<
      NormalizeContext<TParams["_context"]>,
      TNextContext
    >,
  ) => ActionBuilder<{
    _input: TParams["_input"];
    _context: TParams["_context"] extends UnsetMarker
      ? TNextContext
      : Prettify<NormalizeContext<TParams["_context"]> & TNextContext>;
    _inputErrorShape: TParams["_inputErrorShape"];
    _output: TParams["_output"];
  }>;
  /**
   * Input validation for the action.
   */
  input: <
    TParser extends StandardSchemaV1,
    TInputErrorShape = InferParserType<TParser, "out">,
  >(
    input:
      | ((params: {
          ctx: NormalizeContext<TParams["_context"]>;
        }) => Promise<TParser> | TParser)
      | TParser,
  ) => Omit<
    ActionBuilder<{
      _input: TParser;
      _context: TParams["_context"];
      _inputErrorShape: TInputErrorShape;
      _output: TParams["_output"];
    }>,
    "input"
  >;
  /**
   * Output validation for the action result.
   */
  output: <TParser extends StandardSchemaV1>(
    output:
      | ((params: {
          ctx: NormalizeContext<TParams["_context"]>;
        }) => Promise<TParser> | TParser)
      | TParser,
  ) => Omit<
    ActionBuilder<{
      _input: TParams["_input"];
      _context: TParams["_context"];
      _inputErrorShape: TParams["_inputErrorShape"];
      _output: TParser;
    }>,
    "output"
  >;
  /**
   * Create an action.
   */
  action: <TOutput>(
    action: (params: {
      ctx: NormalizeContext<TParams["_context"]>;
      input: InferInputType<TParams["_input"], "out">;
    }) => Promise<ActionHandlerOutput<TParams["_output"], TOutput>>,
  ) => SanitizeFunctionParam<
    (
      input: InferInputType<TParams["_input"], "in">,
    ) => Promise<ActionOutput<TParams["_output"], TOutput>>
  >;
  /**
   * Create an action for React `useActionState`.
   */
  stateAction: StateAction<TParams>;
}

// oxlint-disable-next-line typescript/no-explicit-any
export type AnyActionBuilder = ActionBuilder<any>;

export interface ActionBuilderDef<TParams extends ActionParams> {
  input:
    | ((params: {
        ctx: TParams["_context"];
      }) => Promise<TParams["_input"]> | TParams["_input"])
    | TParams["_input"]
    | undefined;
  output:
    | ((params: {
        ctx: TParams["_context"];
      }) => Promise<TParams["_output"]> | TParams["_output"])
    | TParams["_output"]
    | undefined;
  middleware: MiddlewareDef[];
}

// oxlint-disable-next-line typescript/no-explicit-any
export type AnyActionBuilderDef = ActionBuilderDef<any>;
