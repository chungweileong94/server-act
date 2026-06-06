import type { StandardSchemaV1 } from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import {
  executeMiddlewares,
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
        middleware: [
          ..._def.middleware,
          { kind: "use", middleware } as MiddlewareDef,
        ],
      })) as AnyActionBuilder["use"],
    input: (input) =>
      createNewServerActionBuilder({ ..._def, input }) as AnyActionBuilder,
    action: (action) => {
      // oxlint-disable-next-line typescript/no-explicit-any
      return async (input?: any) => {
        return await executeMiddlewares(_def.middleware, {}, async (ctx) => {
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
        });
      };
    },
    stateAction: (action) => {
      // oxlint-disable-next-line typescript/no-explicit-any
      return async (prevState, rawInput?: any) => {
        return await executeMiddlewares(_def.middleware, {}, async (ctx) => {
          if (_def.input) {
            const inputSchema =
              typeof _def.input === "function"
                ? await _def.input({ ctx: ctx as never })
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
        });
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
