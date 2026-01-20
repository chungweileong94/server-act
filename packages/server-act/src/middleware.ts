type MiddlewarePatch = Record<string, unknown>;

type ChainMiddleware<TPatch extends MiddlewarePatch | void = MiddlewarePatch> =
  (ctx: Record<string, unknown> | undefined) => Promise<TPatch> | TPatch;

type MiddlewareReturn<T> =
  T extends ChainMiddleware<infer TReturn> ? TReturn : never;

type UnionToIntersection<T> = (
  T extends unknown ? (arg: T) => void : never
) extends (arg: infer I) => void
  ? I
  : never;

type MergePatches<TMiddlewares extends readonly unknown[]> = {
  [P in keyof UnionToIntersection<
    Exclude<MiddlewareReturn<TMiddlewares[number]>, void | undefined>
  >]: UnionToIntersection<
    Exclude<MiddlewareReturn<TMiddlewares[number]>, void | undefined>
  >[P];
} & {};

export const experimental_chainMiddleware = <
  const TMiddlewares extends readonly ChainMiddleware<MiddlewarePatch | void>[],
>(
  ...middlewares: TMiddlewares
) => {
  return async () => {
    let ctx: Record<string, unknown> | undefined = undefined;

    for (const middleware of middlewares) {
      const patch = await middleware(ctx);
      if (patch === undefined) {
        continue;
      }
      if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
        throw new Error(
          "server-act: middleware must return an object or undefined.",
        );
      }
      const nextCtx = patch as Record<string, unknown>;
      ctx = Object.assign({}, ctx ?? {}, nextCtx);
    }

    return ctx as MergePatches<TMiddlewares> | undefined;
  };
};
