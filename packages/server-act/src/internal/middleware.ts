export type MiddlewareFunction<TContext, TReturn> = (params: {
  ctx: TContext;
}) => Promise<TReturn> | TReturn;

/**
 * Executes an array of middleware functions with the given initial context.
 */
export async function executeMiddlewares(
  middlewares: Array<MiddlewareFunction<unknown, unknown>>,
  initialCtx?: unknown,
) {
  let ctx: Record<string, unknown> =
    initialCtx && typeof initialCtx === "object" ? { ...initialCtx } : {};
  for (const middleware of middlewares) {
    const result = await middleware({ ctx });
    if (result && typeof result === "object") {
      ctx = { ...ctx, ...result };
    }
  }
  return ctx;
}
