import { hasContentDuplication, hasCustomerPrefix, isDataSourceURI } from '../src/adp/validators';

describe('project input validators', () => {
    describe('hasContentDuplication', () => {
        test('should return true if there is content duplication', () => {
            const output = hasContentDuplication('ZTEST', 'testProperty', [
                { content: { testProperty: { ZTEST: 'test' } } }
            ]);
            expect(output).toEqual(true);
        });

        test('should return false if there is no content duplication', () => {
            const output = hasContentDuplication('ZTEST', 'testProperty', [
                { content: { testProperty: { ZTEST2: 'test' } } }
            ]);
            expect(output).toEqual(false);
        });

        test('should return false if property does not exist', () => {
            const output = hasContentDuplication('ZTEST', 'testProperty', [
                { content: { test1Property: { ZTEST2: 'test' } } }
            ]);
            expect(output).toEqual(false);
        });
    });

    describe('hasCustomerPrefix', () => {
        test('should return true if the value has a customer prefix', () => {
            const output = hasCustomerPrefix('customer.ZTEST');
            expect(output).toEqual(true);
        });

        test('should return false if the value does not have a customer prefix', () => {
            const output = hasCustomerPrefix('ZTEST');
            expect(output).toEqual(false);
        });
    });

    describe('isDataSourceURI', () => {
        test('should return true if the URI is valid', () => {
            const output = isDataSourceURI('/test/');
            expect(output).toEqual(true);
        });

        test('should return false if the URI does not end with /', () => {
            const output = isDataSourceURI('/test');
            expect(output).toEqual(false);
        });

        test('should return false if the URI does not start with /', () => {
            const output = isDataSourceURI('test/');
            expect(output).toEqual(false);
        });

        test('should return false if the URI contains //', () => {
            const output = isDataSourceURI('//test/');
            expect(output).toEqual(false);
        });

        test('should return false if the URI contains whitespace', () => {
            const output = isDataSourceURI('/test /');
            expect(output).toEqual(false);
        });
    });
});
