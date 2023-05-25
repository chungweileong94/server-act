/* eslint-disable @typescript-eslint/no-explicit-any */
import {type z} from 'zod';
import {fromZodError} from 'zod-validation-error';

const unsetMarker = Symbol('unsetMarker');
type UnsetMarker = typeof unsetMarker;

type InferParserType<TParser, TType extends 'in' | 'out'> = TParser extends UnsetMarker
  ? undefined
  : TParser extends z.ZodType
  ? TParser[TType extends 'in' ? '_input' : '_output']
  : never;

type ActionParams<TInput = unknown> = {
  _input: TInput;
};

type ActionBuilder<TParams extends ActionParams> = {
  input: <TParser extends z.ZodType>(input: TParser) => ActionBuilder<{_input: TParser}>;
  action: <TOutput>(
    action: (params: {input: InferParserType<TParams['_input'], 'out'>}) => Promise<TOutput>,
  ) => (input: InferParserType<TParams['_input'], 'in'>) => Promise<TOutput>;
};
type AnyActionBuilder = ActionBuilder<any>;

type ActionBuilderDef<TParams extends ActionParams<any>> = {
  input: TParams['_input'];
};
type AnyActionBuilderDef = ActionBuilderDef<any>;

const createNewServerActionBuilder = (def: Partial<AnyActionBuilderDef>) => {
  return createServerActionBuilder(def);
};

const createServerActionBuilder = (
  initDef: Partial<AnyActionBuilderDef> = {},
): ActionBuilder<{
  _input: UnsetMarker;
}> => {
  const _def: ActionBuilderDef<{_input: z.ZodType | undefined}> = {
    input: undefined,
    ...initDef,
  };
  return {
    input: (input) => createNewServerActionBuilder({..._def, input}) as AnyActionBuilder,
    action: (action) => {
      return async (input) => {
        if (_def.input) {
          const result = _def.input.safeParse(input);
          if (!result.success) {
            throw fromZodError(result.error);
          }
        }
        return await action({input});
      };
    },
  };
};

/**
 * Server action builder
 */
export const serverAct = createServerActionBuilder();
