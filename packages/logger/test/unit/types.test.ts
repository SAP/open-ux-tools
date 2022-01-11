import { getDefaultLogLevel, LogLevel, Transport } from '../../src/types';
import * as utils from '../../src/utils';

describe('types', () => {
    describe('Transport', () => {
        describe('copy()', () => {
            it('Cannot change a property of the returned object', () => {
                const copiedObj = new Transport().copy({ a: 42, b: { nestedKey: 13 } });
                expect(() => {
                    copiedObj.a = 13;
                }).toThrow(TypeError);
            });
            it('Cannot add a property of the returned object', () => {
                const copiedObj = new Transport().copy({ a: 42, b: { nestedKey: 13 } });
                expect(() => {
                    (copiedObj as any).noSuchProperty = 13;
                }).toThrow(TypeError);
            });
            it('Deep clones the object passed in', () => {
                const originalObj = { a: [1, 2, 3], b: { foo: 42 } };
                const copiedObj = new Transport().copy(originalObj);
                originalObj.a.push(4);
                originalObj.b.foo = 13;
                expect(copiedObj).not.toBe(originalObj);
                expect(copiedObj).toStrictEqual({ a: [1, 2, 3], b: { foo: 42 } });
            });
        });
    });

    describe('getDefaultLogLevel', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });
        it('returns LogLevel.Info if env var is unset', () => {
            jest.spyOn(utils, 'getEnvVar').mockReturnValueOnce(undefined);
            expect(getDefaultLogLevel()).toBe(LogLevel.Info);
        });
        it('returns correct value for lowercased value', () => {
            jest.spyOn(utils, 'getEnvVar').mockReturnValueOnce('silly');
            expect(getDefaultLogLevel()).toBe(LogLevel.Silly);
        });
        it('works regardless of case of env variable', () => {
            jest.spyOn(utils, 'getEnvVar').mockReturnValueOnce('dEbUG');
            expect(getDefaultLogLevel()).toBe(LogLevel.Debug);
        });
        it('defaults to LogLevel.Info if env var value is invalid', () => {
            jest.spyOn(utils, 'getEnvVar').mockReturnValueOnce('wossname');
            expect(getDefaultLogLevel()).toBe(LogLevel.Info);
        });
    });
});
