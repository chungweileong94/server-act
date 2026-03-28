export type LegacyMiddlewareFunction<TContext, TReturn> = (params: {
  ctx: TContext;
}) => Promise<TReturn> | TReturn;

type MiddlewareContext = Record<string, unknown>;
type Awaitable<T> = T | Promise<T>;
declare const middlewareResultBrand: unique symbol;

export type MiddlewareResult<
  TAddedContext extends MiddlewareContext = MiddlewareContext,
> = {
  readonly [middlewareResultBrand]?: TAddedContext;
};

export type MiddlewareNextFunction = <
  TAddedContext extends MiddlewareContext = {},
>(opts?: {
  ctx?: TAddedContext;
}) => Promise<MiddlewareResult<TAddedContext>>;

export type UseMiddlewareFunction<
  TContext extends MiddlewareContext,
  TAddedContext extends MiddlewareContext,
> = (params: {
  ctx: TContext;
  next: MiddlewareNextFunction;
}) => Awaitable<MiddlewareResult<TAddedContext>>;

export type MiddlewareDef =
  | {
      kind: "legacy";
      middleware: LegacyMiddlewareFunction<unknown, unknown>;
    }
  | {
      kind: "use";
      middleware: UseMiddlewareFunction<MiddlewareContext, MiddlewareContext>;
    };

function normalizeCtx(ctx?: unknown) {
  return ctx && typeof ctx === "object" ? { ...ctx } : {};
}

/**
 * Executes an array of middleware functions with the given initial context.
 */
export async function executeMiddlewares<TOutput>(
  middlewares: MiddlewareDef[],
  initialCtx: unknown,
  terminal: (ctx: Record<string, unknown>) => Promise<TOutput>,
) {
  const executeAt = async (
    index: number,
    ctx: Record<string, unknown>,
  ): Promise<TOutput> => {
    const entry = middlewares[index];

    if (!entry) {
      return await terminal(ctx);
    }

    if (entry.kind === "legacy") {
      const result = await entry.middleware({ ctx });
      const nextCtx =
        result && typeof result === "object" ? { ...ctx, ...result } : ctx;
      return await executeAt(index + 1, nextCtx);
    }

    let nextCalled = false;
    const result = await entry.middleware({
      ctx,
      next: async <TAddedContext extends MiddlewareContext = {}>(opts?: {
        ctx?: TAddedContext;
      }) => {
        nextCalled = true;
        const nextCtx = opts?.ctx ? { ...ctx, ...opts.ctx } : ctx;
        return (await executeAt(
          index + 1,
          nextCtx,
        )) as MiddlewareResult<TAddedContext>;
      },
    });

    if (!nextCalled) {
      throw new Error(".use() middleware must call next()");
    }

    return result as TOutput;
  };

  return await executeAt(0, normalizeCtx(initialCtx));
}
