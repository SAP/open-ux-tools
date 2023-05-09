import { validateLibName, validateNamespace, validateUI5Version } from '../../src/data/validators';
import { t } from '../../src/i18n';

describe('validators', () => {
    describe('validateLibName', () => {
        it('should return true for a valid library name', () => {
            const libName = 'myLib';
            const result = validateLibName(libName);
            expect(result).toBe(true);
        });

        it('should return error for an empty libName', () => {
            expect(() => {
                validateLibName('');
            }).toThrowError(t('error.missingRequiredProperty', { propertyName: 'libraryName' }));
        });

        it('should return error for an invalid libName', () => {
            expect(() => {
                validateLibName('Test"App');
            }).toThrowError(t('error.disallowedCharacters', { propertyName: 'libraryName', disallowedChars: '"' }));
        });
    });

    describe('validateUI5Version', () => {
        it('should return true for a valid UI5 version', () => {
            const namespace = '1.2.3';
            const result = validateUI5Version(namespace);
            expect(result).toBe(true);
        });

        it('should return error for an invalid UI5 version', () => {
            expect(() => {
                validateUI5Version('!@$');
            }).toThrowError(t('error.invalidUI5Version', { version: '!@$' }));
        });
    });

    describe('namespace', () => {
        it('should return error for an empty namespace', () => {
            const namespace = '';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.missingRequiredProperty', { propertyName: 'namespace' }));
        });

        it('should return true for a valid namespace', () => {
            const namespace = 'ValidNamespace';
            const result = validateNamespace(namespace);
            expect(result).toBe(true);
        });

        it('should throw an error for a namespace starting with a non-letter character', () => {
            const namespace = '123InvalidNamespace';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.mustStartWithLetter'));
        });

        it('should throw an error for a namespace ending with a period', () => {
            const namespace = 'InvalidNamespace.';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.mustEndInPeriod'));
        });

        it('should throw an error for the namespace "SAP"', () => {
            const namespace = 'SAP';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.cannotBeSap'));
        });

        it('should throw an error for a namespace starting with "new"', () => {
            const namespace = 'newInvalidNamespace';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.cannotStartWithNew'));
        });

        it('should throw an error for a namespace containing a number after a period', () => {
            const namespace = 'InvalidNamespace.1';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.numAfterPeriod'));
        });

        it('should throw an error for a namespace containing special characters', () => {
            const namespace = 'Invalid#Namespace';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.specialCharacter'));
        });

        it('should throw an error for a namespace exceeding the maximum length', () => {
            const namespace = 'VeryLongInvalidNamespaceThatExceedsTheMaximumLengthLimitOfSeventyCharacters';
            expect(() => {
                validateNamespace(namespace);
            }).toThrowError(t('error.invalidNamespace.tooLong', { length: 70 }));
        });
    });
});
