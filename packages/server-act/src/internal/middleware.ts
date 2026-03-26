export type LegacyMiddlewareFunction<TContext, TReturn> = (params: {
  ctx: TContext;
}) => Promise<TReturn> | TReturn;

type MiddlewareContext = Record<string, unknown>;
type Prettify<T> = {
  [P in keyof T]: T[P];
} & {};

export type MiddlewareNextFunction<TContext extends MiddlewareContext> = <
  TAddedContext extends MiddlewareContext,
>(opts?: {
  ctx?: TAddedContext;
}) => Promise<Prettify<TContext & TAddedContext>>;

export type UseMiddlewareFunction<
  TContext extends MiddlewareContext,
  TNextContext extends MiddlewareContext,
> = (params: {
  ctx: TContext;
  next: MiddlewareNextFunction<TContext>;
}) => Promise<TNextContext> | TNextContext;

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
export async function executeMiddlewares(
  middlewares: MiddlewareDef[],
  initialCtx?: unknown,
) {
  const executeAt = async (
    index: number,
    ctx: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    const entry = middlewares[index];

    if (!entry) {
      return ctx;
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
      next: async (opts) => {
        nextCalled = true;
        const nextCtx = opts?.ctx ? { ...ctx, ...opts.ctx } : ctx;
        return (await executeAt(index + 1, nextCtx)) as Prettify<
          typeof ctx & NonNullable<typeof opts>["ctx"]
        >;
      },
    });

    if (!nextCalled) {
      throw new Error(".use() middleware must call next()");
    }

    return normalizeCtx(result);
  };

  return await executeAt(0, normalizeCtx(initialCtx));
}
