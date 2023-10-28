/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {type z} from 'zod';
import {fromZodError} from 'zod-validation-error';

type Prettify<T> = {
  [P in keyof T]: T[P];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

const unsetMarker = Symbol('unsetMarker');
type UnsetMarker = typeof unsetMarker;

type OptionalizeUndefined<T> = undefined extends T ? [param?: T] : [param: T];

type InferParserType<TParser, TType extends 'in' | 'out'> = TParser extends UnsetMarker
  ? undefined
  : TParser extends z.ZodType
  ? TParser[TType extends 'in' ? '_input' : '_output']
  : never;

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
      input: InferParserType<TParams['_input'], 'out'>;
    }) => Promise<TOutput>,
  ) => (...[input]: OptionalizeUndefined<InferParserType<TParams['_input'], 'in'>>) => Promise<TOutput>;
  /**
   * Create an action for React `useFormState`
   */
  formAction: <TState>(
    action: (
      params: Prettify<
        {
          ctx: InferContextType<TParams['_context']>;
          prevState: any; // FIXME: This supposes to be `TState`, but we can't, as it will break the type.
        } & (
          | {input: InferParserType<TParams['_input'], 'out'>; formErrors?: undefined}
          | {
              input?: undefined;
              formErrors: z.ZodError<
                // Infer the input out-type if the in-type is formData, else the zod error type is incorrect
                FormData extends InferParserType<TParams['_input'], 'in'>
                  ? InferParserType<TParams['_input'], 'out'>
                  : InferParserType<TParams['_input'], 'in'>
              >;
            }
        )
      >,
    ) => Promise<TState>,
  ) => (prevState: TState, formData: FormData) => Promise<TState>;
}
type AnyActionBuilder = ActionBuilder<any>;

interface ActionBuilderDef<TParams extends ActionParams<any>> {
  input: TParams['_input'];
  middleware: (() => Promise<TParams['_context']> | TParams['_context']) | undefined;
}
type AnyActionBuilderDef = ActionBuilderDef<any>;

const createNewServerActionBuilder = (def: Partial<AnyActionBuilderDef>) => {
  return createServerActionBuilder(def);
};

const createServerActionBuilder = (
  initDef: Partial<AnyActionBuilderDef> = {},
): ActionBuilder<{
  _input: UnsetMarker;
  _context: UnsetMarker;
}> => {
  const _def: ActionBuilderDef<{_input: z.ZodType | undefined; _context: undefined}> = {
    input: undefined,
    middleware: undefined,
    ...initDef,
  };
  return {
    middleware: (middleware) => createServerActionBuilder({..._def, middleware}) as AnyActionBuilder,
    input: (input) => createNewServerActionBuilder({..._def, input}) as AnyActionBuilder,
    action: (action) => {
      return async (input) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const result = _def.input.safeParse(input);
          if (!result.success) {
            throw fromZodError(result.error);
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
};

/**
 * Server action builder
 */
export const serverAct = createServerActionBuilder();
