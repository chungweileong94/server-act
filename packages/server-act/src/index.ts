import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import {
  createMiddlewareRunner,
  type MiddlewareDef,
  type UseMiddlewareFunction,
} from "./internal/middleware";
import { getInputErrors, standardValidate } from "./internal/schema";
import {
  type ActionBuilder,
  type ActionBuilderDef,
  type AnyActionBuilder,
  type AnyActionBuilderDef,
  type UnsetMarker,
} from "./internal/types";
export type { InputErrors } from "./internal/types";

function createNewServerActionBuilder(def: Partial<AnyActionBuilderDef>) {
  return createServerActionBuilder(def);
}

function createServerActionBuilder(
  initDef: Partial<AnyActionBuilderDef> = {},
): ActionBuilder<{
  _input: UnsetMarker;
  _context: UnsetMarker;
  _inputErrorShape: UnsetMarker;
}> {
  const _def: ActionBuilderDef<{
    _input: StandardSchemaV1;
    _context: undefined;
    _inputErrorShape: unknown;
  }> = {
    input: undefined,
    middleware: [],
    ...initDef,
  };
  return {
    middleware: (middleware) =>
      createNewServerActionBuilder({
        ..._def,
        middleware: [
          ..._def.middleware,
          { kind: "legacy", middleware } as MiddlewareDef,
        ],
      }) as AnyActionBuilder,
    use: ((
      middleware: UseMiddlewareFunction<
        Record<string, unknown>,
        Record<string, unknown>
      >,
    ) =>
      createNewServerActionBuilder({
        ..._def,
        middleware: [..._def.middleware, { kind: "use", middleware }],
      })) as AnyActionBuilder["use"],
    input: (input) =>
      createNewServerActionBuilder({ ..._def, input }) as AnyActionBuilder,
    action: (action) => {
      const middlewareRunner =
        _def.middleware.length > 0
          ? createMiddlewareRunner(_def.middleware)
          : undefined;
      // oxlint-disable-next-line typescript/no-explicit-any
      const runAction = async (ctx: Record<string, unknown>, input?: any) => {
        if (_def.input) {
          const inputSchema =
            typeof _def.input === "function"
              ? await _def.input({ ctx: ctx as never })
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

      // oxlint-disable-next-line typescript/no-explicit-any
      return async (input?: any) => {
        if (middlewareRunner) {
          return await middlewareRunner({}, (ctx) => runAction(ctx, input));
        }
        return await runAction({}, input);
      };
    },
    stateAction: (action) => {
      const middlewareRunner =
        _def.middleware.length > 0
          ? createMiddlewareRunner(_def.middleware)
          : undefined;
      const runStateAction = async (
        ctx: Record<string, unknown>,
        prevState: unknown,
        rawInput?: unknown,
      ) => {
        if (_def.input) {
          const inputSchema =
            typeof _def.input === "function"
              ? await _def.input({ ctx: ctx as never })
              : _def.input;
          const result = await standardValidate(inputSchema, rawInput);
          if (result.issues) {
            return await action({
              ctx,
              prevState: prevState as never,
              rawInput: rawInput as never,
              inputErrors: getInputErrors(result.issues),
            });
          }
          return await action({
            ctx,
            prevState: prevState as never,
            rawInput: rawInput as never,
            // oxlint-disable-next-line typescript/no-explicit-any
            input: result.value as any,
          });
        }
        return await action({
          ctx,
          prevState: prevState as never,
          rawInput: rawInput as never,
          input: undefined,
        });
      };

      // oxlint-disable-next-line typescript/no-explicit-any
      return async (prevState, rawInput?: any) => {
        if (middlewareRunner) {
          return await middlewareRunner({}, (ctx) =>
            runStateAction(ctx, prevState, rawInput),
          );
        }
        return await runStateAction({}, prevState, rawInput);
      };
    },
  };
}

/**
 * Server action builder
 */
export const serverAct = createServerActionBuilder();

/**
 * Create reusable middleware
 */
export function createServerActMiddleware<
  TAddedContext extends Record<string, unknown>,
  TContext extends Record<string, unknown> = {},
>(
  middleware: UseMiddlewareFunction<TContext, TAddedContext>,
): UseMiddlewareFunction<TContext, TAddedContext> {
  return middleware;
}
