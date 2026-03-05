export type MiddlewareFunction<TContext, TReturn> = (params: {
  ctx: TContext;
}) => Promise<TReturn> | TReturn;

declare const nextContextSymbol: unique symbol;

export type NextContextCarrier<TContext extends object> = {
  readonly [nextContextSymbol]: TContext;
};

export type NextFunction = <TNextContext extends object = {}>(
  ctx?: TNextContext,
) => Promise<NextContextCarrier<TNextContext>>;

export type UseMiddlewareFunction<TContext> = (params: {
  ctx: TContext;
  next: NextFunction;
}) => Promise<unknown> | unknown;

export interface MiddlewareExecutionResult {
  ctx: Record<string, unknown>;
  completed: boolean;
}

function mergeContext(
  ctx: Record<string, unknown>,
  update: unknown,
): Record<string, unknown> {
  if (update && typeof update === "object") {
    return { ...ctx, ...update };
  }
  return ctx;
}

export function adaptLegacyMiddleware<TContext, TReturn>(
  middleware: MiddlewareFunction<TContext, TReturn>,
): UseMiddlewareFunction<TContext> {
  return async ({ ctx, next }) => {
    const result = await middleware({ ctx });
    await next(result as Record<string, unknown> | undefined);
  };
}

/**
 * Executes an array of middleware functions with the given initial context.
 */
export async function executeMiddlewares(
  middlewares: Array<UseMiddlewareFunction<Record<string, unknown>>>,
  initialCtx?: unknown,
): Promise<MiddlewareExecutionResult> {
  const initial: Record<string, unknown> =
    initialCtx && typeof initialCtx === "object" ? { ...initialCtx } : {};

  const dispatch = async (
    index: number,
    ctx: Record<string, unknown>,
  ): Promise<MiddlewareExecutionResult> => {
    if (index >= middlewares.length) {
      return { ctx, completed: true };
    }

    const middleware = middlewares[index];
    if (!middleware) {
      return { ctx, completed: true };
    }

    let nextCalled = false;
    let nextResult: MiddlewareExecutionResult = { ctx, completed: true };

    await middleware({
      ctx,
      next: async <TNextContext extends object = {}>(update?: TNextContext) => {
        if (nextCalled) {
          throw new Error("next() called multiple times");
        }
        nextCalled = true;
        nextResult = await dispatch(index + 1, mergeContext(ctx, update));
        return undefined as unknown as NextContextCarrier<TNextContext>;
      },
    });

    if (!nextCalled) {
      return { ctx, completed: false };
    }

    return nextResult;
  };

  if (middlewares.length === 0) {
    return { ctx: initial, completed: true };
  }

  return dispatch(0, initial);
}
