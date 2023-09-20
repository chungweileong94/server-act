/* eslint-disable @typescript-eslint/no-explicit-any */
import {type z} from 'zod';
import {fromZodError} from 'zod-validation-error';

const unsetMarker = Symbol('unsetMarker');
type UnsetMarker = typeof unsetMarker;

type OptionalizeUndefined<T> = undefined extends T ? [param?: T] : [param: T];

type InferParserType<TParser, TType extends 'in' | 'out'> = TParser extends UnsetMarker
  ? undefined
  : TParser extends z.ZodType
  ? TParser[TType extends 'in' ? '_input' : '_output']
  : never;

type InferContextType<T> = T extends UnsetMarker ? undefined : T;

type ActionParams<TInput = unknown, TContext = unknown> = {
  _input: TInput;
  _context: TContext;
};

type ActionBuilder<TParams extends ActionParams> = {
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
   * ***Experimental*** - Create an action for React `useFormState`
   */
  experimental_formAction: <
    TOutput,
    TFormErrors extends z.ZodError<InferParserType<TParams['_input'], 'in'>>['formErrors'],
  >(
    action: (params: {
      ctx: InferContextType<TParams['_context']>;
      input: InferParserType<TParams['_input'], 'out'>;
    }) => Promise<TOutput>,
  ) => (
    prevState: TOutput,
    formData: FormData,
  ) => Promise<{output: TOutput; formErrors?: never} | {output?: never; formErrors: TFormErrors}>;
};
type AnyActionBuilder = ActionBuilder<any>;

type ActionBuilderDef<TParams extends ActionParams<any>> = {
  input: TParams['_input'];
  middleware: (() => Promise<TParams['_context']> | TParams['_context']) | undefined;
};
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
    experimental_formAction: (action) => {
      return async (_, formData) => {
        const ctx = await _def.middleware?.();
        if (_def.input) {
          const result = _def.input.safeParse(Object.fromEntries(formData.entries()));
          if (!result.success) {
            return {formErrors: result.error.formErrors.fieldErrors as any};
          }
          const output = await action({ctx, input: result.data});
          return {output};
        }
        const output = await action({ctx, input: undefined});
        return {output};
      };
    },
  };
};

/**
 * Server action builder
 */
export const serverAct = createServerActionBuilder();
