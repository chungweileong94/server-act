import type {z} from 'zod';

const unsetMarker = Symbol('unsetMarker');
type UnsetMarker = typeof unsetMarker;

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Prettify<T> = {
  [P in keyof T]: T[P];
} & {};

// biome-ignore lint/suspicious/noExplicitAny: Intended
type SanitizeFunctionParam<T extends (param: any) => any> = T extends (param: infer P) => infer R
  ? Equals<P, undefined> extends true
    ? () => R
    : Equals<P, P | undefined> extends true
      ? (param?: P) => R
      : (param: P) => R
  : never;

// biome-ignore lint/suspicious/noExplicitAny: Intended
type InferParserType<T, TType extends 'in' | 'out'> = T extends z.ZodEffects<infer I, any, any>
  ? I[TType extends 'in' ? '_input' : '_output']
  : T extends z.ZodType
    ? T[TType extends 'in' ? '_input' : '_output']
    : never;

type InferInputType<T, TType extends 'in' | 'out'> = T extends UnsetMarker ? undefined : InferParserType<T, TType>;

type InferContextType<T> = T extends UnsetMarker ? undefined : T;

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
  ) => ActionBuilder<{_input: TParams['_input']; _context: TContext}>;
  /**
   * Input validation for the action.
   */
  input: <TParser extends z.ZodType>(input: TParser) => ActionBuilder<{_input: TParser; _context: TParams['_context']}>;
  /**
   * Create an action.
   */
  action: <TOutput>(
    action: (params: {
      ctx: InferContextType<TParams['_context']>;
      input: InferInputType<TParams['_input'], 'out'>;
    }) => Promise<TOutput>,
  ) => SanitizeFunctionParam<(input: InferInputType<TParams['_input'], 'in'>) => Promise<TOutput>>;
  /**
   * Create an action for React `useFormState`
   */
  formAction: <TState>(
    action: (
      params: Prettify<
        {
          ctx: InferContextType<TParams['_context']>;
          // biome-ignore lint/suspicious/noExplicitAny: Intended
          prevState: any; // FIXME: This supposes to be `TState`, but we can't, as it will break the type.
        } & (
          | {input: InferInputType<TParams['_input'], 'out'>; formErrors?: undefined}
          | {
              input?: undefined;
              formErrors: z.ZodError<InferInputType<TParams['_input'], 'in'>>;
            }
        )
      >,
    ) => Promise<TState>,
  ) => (prevState: TState, formData: FormData) => Promise<TState>;
}
// biome-ignore lint/suspicious/noExplicitAny: Intended
type AnyActionBuilder = ActionBuilder<any>;

// biome-ignore lint/suspicious/noExplicitAny: Intended
interface ActionBuilderDef<TParams extends ActionParams<any>> {
  input: TParams['_input'];
  middleware: (() => Promise<TParams['_context']> | TParams['_context']) | undefined;
}
// biome-ignore lint/suspicious/noExplicitAny: Intended
type AnyActionBuilderDef = ActionBuilderDef<any>;

function createNewServerActionBuilder(def: Partial<AnyActionBuilderDef>) {
  return createServerActionBuilder(def);
}

function createServerActionBuilder(initDef: Partial<AnyActionBuilderDef> = {}): ActionBuilder<{
  _input: UnsetMarker;
  _context: UnsetMarker;
}> {
  const _def: ActionBuilderDef<{_input: z.ZodType | undefined; _context: undefined}> = {
    input: undefined,
    middleware: undefined,
    ...initDef,
  };
  return {
    middleware: (middleware) => createNewServerActionBuilder({..._def, middleware}) as AnyActionBuilder,
    input: (input) => createNewServerActionBuilder({..._def, input}) as AnyActionBuilder,
    action: (action) => {
      // biome-ignore lint/suspicious/noExplicitAny: Intended
      return async (input?: any) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const result = _def.input.safeParse(input);
          if (!result.success) {
            console.error('❌ Input validation error:', result.error.errors);
            throw new Error('Input validation error');
          }
        }
        return await action({ctx, input});
      };
    },
    formAction: (action) => {
      return async (prevState, formData) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const result = _def.input.safeParse(formData);
          if (!result.success) {
            return await action({ctx, prevState, formErrors: result.error});
          }
          return await action({ctx, prevState, input: result.data});
        }
        return await action({ctx, prevState, input: undefined});
      };
    },
  };
}

/**
 * Server action builder
 */
export const serverAct = createServerActionBuilder();
