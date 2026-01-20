import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import { getInputErrors, standardValidate } from "./internal/schema";

const unsetMarker = Symbol("unsetMarker");
type UnsetMarker = typeof unsetMarker;

type RemoveUnsetMarker<T> = T extends UnsetMarker ? undefined : T;

type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

type Prettify<T> = {
  [P in keyof T]: T[P];
} & {};

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

type InferContextType<T> = RemoveUnsetMarker<T>;

interface ActionParams<TInput = unknown, TContext = unknown> {
  _input: TInput;
  _context: TContext;
}

interface ActionBuilder<TParams extends ActionParams> {
  /**
   * Middleware allows you to run code before the action, its return value will pass as context to the action.
   */
  middleware: <TContext>(
    middleware: () => Promise<TContext> | TContext,
  ) => Omit<
    ActionBuilder<{ _input: TParams["_input"]; _context: TContext }>,
    "middleware"
  >;
  /**
   * Input validation for the action.
   */
  input: <TParser extends StandardSchemaV1>(
    input:
      | ((params: {
          ctx: InferContextType<TParams["_context"]>;
        }) => Promise<TParser> | TParser)
      | TParser,
  ) => Omit<
    ActionBuilder<{ _input: TParser; _context: TParams["_context"] }>,
    "input"
  >;
  /**
   * Create an action.
   */
  action: <TOutput>(
    action: (params: {
      ctx: InferContextType<TParams["_context"]>;
      input: InferInputType<TParams["_input"], "out">;
    }) => Promise<TOutput>,
  ) => SanitizeFunctionParam<
    (input: InferInputType<TParams["_input"], "in">) => Promise<TOutput>
  >;
  /**
   * Create an action for React `useActionState`
   */
  stateAction: <TState, TPrevState = UnsetMarker>(
    action: (
      params: Prettify<
        {
          ctx: InferContextType<TParams["_context"]>;
          prevState: RemoveUnsetMarker<TPrevState>;
          rawInput: InferInputType<TParams["_input"], "in">;
        } & (
          | {
              input: InferInputType<TParams["_input"], "out">;
              inputErrors?: undefined;
            }
          | {
              input?: undefined;
              inputErrors: ReturnType<typeof getInputErrors>;
            }
        )
      >,
    ) => Promise<TState>,
  ) => (
    prevState: TState | RemoveUnsetMarker<TPrevState>,
    input: InferInputType<TParams["_input"], "in">,
  ) => Promise<TState | RemoveUnsetMarker<TPrevState>>;
  /**
   * Create an action for React `useActionState`
   *
   * @deprecated Use `stateAction` instead.
   */
  formAction: <TState, TPrevState = UnsetMarker>(
    action: (
      params: Prettify<
        {
          ctx: InferContextType<TParams["_context"]>;
          prevState: RemoveUnsetMarker<TPrevState>;
          formData: FormData;
        } & (
          | {
              input: InferInputType<TParams["_input"], "out">;
              formErrors?: undefined;
            }
          | {
              input?: undefined;
              formErrors: ReturnType<typeof getInputErrors>;
            }
        )
      >,
    ) => Promise<TState>,
  ) => (
    prevState: TState | RemoveUnsetMarker<TPrevState>,
    formData: InferInputType<TParams["_input"], "in">,
  ) => Promise<TState | RemoveUnsetMarker<TPrevState>>;
}
// oxlint-disable-next-line typescript/no-explicit-any
type AnyActionBuilder = ActionBuilder<any>;

// oxlint-disable-next-line typescript/no-explicit-any
interface ActionBuilderDef<TParams extends ActionParams<any>> {
  input:
    | ((params: {
        ctx: TParams["_context"];
      }) => Promise<TParams["_input"]> | TParams["_input"])
    | TParams["_input"]
    | undefined;
  middleware:
    | (() => Promise<TParams["_context"]> | TParams["_context"])
    | undefined;
}
// oxlint-disable-next-line typescript/no-explicit-any
type AnyActionBuilderDef = ActionBuilderDef<any>;

function createNewServerActionBuilder(def: Partial<AnyActionBuilderDef>) {
  return createServerActionBuilder(def);
}

function createServerActionBuilder(
  initDef: Partial<AnyActionBuilderDef> = {},
): ActionBuilder<{
  _input: UnsetMarker;
  _context: UnsetMarker;
}> {
  const _def: ActionBuilderDef<{
    _input: StandardSchemaV1;
    _context: undefined;
  }> = {
    input: undefined,
    middleware: undefined,
    ...initDef,
  };
  return {
    middleware: (middleware) =>
      createNewServerActionBuilder({ ..._def, middleware }) as AnyActionBuilder,
    input: (input) =>
      createNewServerActionBuilder({ ..._def, input }) as AnyActionBuilder,
    action: (action) => {
      // oxlint-disable-next-line typescript/no-explicit-any
      return async (input?: any) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const inputSchema =
            typeof _def.input === "function"
              ? await _def.input({ ctx })
              : _def.input;
          const result = await standardValidate(inputSchema, input);
          if (result.issues) {
            throw new SchemaError(result.issues);
          }
          // oxlint-disable-next-line typescript/no-explicit-any
          return await action({ ctx, input: result.value as any });
        }
        return await action({ ctx, input: undefined });
      };
    },
    stateAction: (action) => {
      // oxlint-disable-next-line typescript/no-explicit-any
      return async (prevState, rawInput?: any) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const inputSchema =
            typeof _def.input === "function"
              ? await _def.input({ ctx })
              : _def.input;
          const result = await standardValidate(inputSchema, rawInput);
          if (result.issues) {
            return await action({
              ctx,
              // oxlint-disable-next-line typescript/no-explicit-any
              prevState: prevState as any,
              rawInput,
              inputErrors: getInputErrors(result.issues),
            });
          }
          return await action({
            ctx,
            // oxlint-disable-next-line typescript/no-explicit-any
            prevState: prevState as any,
            rawInput,
            // oxlint-disable-next-line typescript/no-explicit-any
            input: result.value as any,
          });
        }
        return await action({
          ctx,
          // oxlint-disable-next-line typescript/no-explicit-any
          prevState: prevState as any,
          rawInput,
          input: undefined,
        });
      };
    },
    formAction: (action) => {
      // oxlint-disable-next-line typescript/no-explicit-any
      return async (prevState, formData?: any) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const inputSchema =
            typeof _def.input === "function"
              ? await _def.input({ ctx })
              : _def.input;
          const result = await standardValidate(inputSchema, formData);
          if (result.issues) {
            return await action({
              ctx,
              // oxlint-disable-next-line typescript/no-explicit-any
              prevState: prevState as any,
              formData,
              formErrors: getInputErrors(result.issues),
            });
          }
          return await action({
            ctx,
            // oxlint-disable-next-line typescript/no-explicit-any
            prevState: prevState as any,
            formData,
            // oxlint-disable-next-line typescript/no-explicit-any
            input: result.value as any,
          });
        }
        return await action({
          ctx,
          // oxlint-disable-next-line typescript/no-explicit-any
          prevState: prevState as any,
          formData,
          input: undefined,
        });
      };
    },
  };
}

/**
 * Server action builder
 */
export const serverAct = createServerActionBuilder();
