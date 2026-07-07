export type LegacyMiddlewareFunction<TContext, TReturn> = (params: {
  ctx: TContext;
}) => Promise<TReturn> | TReturn;

type MiddlewareContext = Record<string, unknown>;
type Awaitable<T> = T | Promise<T>;
type MiddlewareTerminal<TOutput> = (ctx: MiddlewareContext) => Promise<TOutput>;
type MiddlewareStep = <TOutput>(
  ctx: MiddlewareContext,
  terminal: MiddlewareTerminal<TOutput>,
) => Promise<TOutput>;

declare const middlewareResultBrand: unique symbol;

export type MiddlewareResult<
  TAddedContext extends MiddlewareContext = MiddlewareContext,
> = {
  readonly [middlewareResultBrand]: TAddedContext;
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

type MiddlewareRunner = <TOutput>(
  initialCtx: unknown,
  terminal: MiddlewareTerminal<TOutput>,
) => Promise<TOutput>;

const runTerminal: MiddlewareStep = async (ctx, terminal) =>
  await terminal(ctx);

export function createMiddlewareRunner(
  middlewares: readonly MiddlewareDef[],
): MiddlewareRunner {
  if (middlewares.length === 0) {
    return async (initialCtx, terminal) =>
      await terminal(normalizeCtx(initialCtx));
  }

  let run = runTerminal;

  for (let index = middlewares.length - 1; index >= 0; index--) {
    const entry = middlewares[index];
    if (!entry) continue;

    const nextStep = run;

    if (entry.kind === "legacy") {
      run = async (ctx, terminal) => {
        const result = await entry.middleware({ ctx });
        const nextCtx =
          result && typeof result === "object" ? { ...ctx, ...result } : ctx;
        return await nextStep(nextCtx, terminal);
      };
      continue;
    }

    run = async <TOutput>(
      ctx: MiddlewareContext,
      terminal: MiddlewareTerminal<TOutput>,
    ) => {
      let nextCalled = false;
      const result = await entry.middleware({
        ctx,
        next: async <TAddedContext extends MiddlewareContext = {}>(opts?: {
          ctx?: TAddedContext;
        }) => {
          if (nextCalled) {
            throw new Error(".use() middleware must call next() only once");
          }
          nextCalled = true;
          const nextCtx = opts?.ctx ? { ...ctx, ...opts.ctx } : ctx;
          return (await nextStep(
            nextCtx,
            terminal,
          )) as MiddlewareResult<TAddedContext>;
        },
      });

      if (!nextCalled) {
        throw new Error(".use() middleware must call next()");
      }

      return result as TOutput;
    };
  }

  return async (initialCtx, terminal) =>
    await run(normalizeCtx(initialCtx), terminal);
}
