import { Severity } from '@sap-devx/yeoman-ui-types';
import type { YUIQuestion } from '../../../src/types';
import { extendAdditionalMessages } from '../../../src/prompts/helpers';

describe('extendAdditionalMessages', () => {
    it('should return the extended prompt message first', () => {
        const question = {
            name: 'test',
            additionalMessages: (value: unknown) => {
                if (value === 'test') {
                    return 'test message';
                }
            }
        } as YUIQuestion;

        const addMsgFunc = (value: unknown) => {
            if (value === 'test') {
                return { message: 'extended test message', severity: Severity.error };
            }
        };
        const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
        expect(extendedFunc('test')).toStrictEqual({ message: 'extended test message', severity: Severity.error });
    });

    it('should return the original prompt message if the extended message is not valid', () => {
        const question = {
            additionalMessages: (value: unknown) => {
                if (value === 'test') {
                    return 'test message';
                }
            }
        } as YUIQuestion;
        const addMsgFunc = (value: unknown) => {
            if (value === 'test') {
                return undefined;
            }
        };
        const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
        expect(extendedFunc('test')).toBe('test message');
    });

    it('should return the original prompt message if the extended message is not a function', () => {
        const question = {
            additionalMessages: {}
        } as YUIQuestion;

        const addMsgFunc = (value: unknown) => {
            if (value === 'test') {
                return undefined;
            }
        };
        const extendedFunc = extendAdditionalMessages(question, addMsgFunc);
        expect(extendedFunc('test')).toBe(undefined);
    });
});
