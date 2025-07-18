import { t } from '../src/i18n';
import {
    validateAppDescription,
    validateAppName,
    validatePackage,
    validateTransportRequestNumber
} from '../src/deploy/validators';

describe('project input validators', () => {
    describe('validateAppName', () => {
        test('validateAppName - valid simple name', () => {
            const output = validateAppName('ZTEST', 'Z');
            expect(output).toEqual(true);
        });

        test('validateAppName - valid namespace, valid app name', () => {
            const output = validateAppName('ZNS/ZTEST', 'Z');
            expect(output).toEqual(true);
        });

        test('validateAppName - valid namespace, valid app name', () => {
            const output = validateAppName('ZNS/TEST', 'Z');
            expect(output).toEqual(true);
        });

        test('validateAppName - empty length', () => {
            const output = validateAppName('');
            expect(output).toEqual(t('deploy.abapAppNameRequired'));
        });
        test('validateAppName - invalid namespace', () => {
            const output = validateAppName('/ns1/ns2/ns3/ztest');
            expect(output).toEqual(t('deploy.abapInvalidNamespace'));
        });

        test('validateAppName - invalid namespace length', () => {
            const ns = 'ns1looooooonooog';
            const output = validateAppName(`/${ns}/ztest`);
            expect(output).toEqual(t('deploy.abapInvalidNamespaceLength', { length: ns.length }));
        });

        test('validateAppName - valid namespace length, invalid app name length', () => {
            const appName = 'appnamelooooooonooooooog';
            const output = validateAppName(`/ns/${appName}`);
            expect(output).toEqual(t('deploy.abapInvalidAppNameLength', { length: appName.length }));
        });

        test('validateAppName - invalid namespace length, invalid app name length', () => {
            const ns = 'ns1looooooonooog';
            const appName = 'appnamelooooooonooooooog';
            const output = validateAppName(`/${ns}/${appName}`);
            expect(output).toContain(t('deploy.abapInvalidNamespaceLength', { length: ns.length }));
            expect(output).toContain(t('deploy.abapInvalidAppNameLength', { length: appName.length }));
        });

        test('validateAppName - invalid app name length', () => {
            const appName = 'appnamelooooooonooooooog';
            const output = validateAppName(appName);
            expect(output).toEqual(t('deploy.abapInvalidAppNameLength', { length: appName.length }));
        });

        test('validateAppName - invalid app name prefix', () => {
            const appName = 'appnamelooooooonooooooog';
            const prefix = 'Z';
            const output = validateAppName(appName, prefix);
            expect(output).toContain(t('deploy.abapInvalidAppNameLength', { length: appName.length }));
            expect(output).toContain(t('deploy.abapInvalidAppName', { prefix }));
        });

        test('validateAppName - invalid app name prefix', () => {
            const appName = 'appname-looooooonooooooog';
            const prefix = 'Z';
            const output = validateAppName(appName, prefix);
            expect(output).toContain(t('deploy.abapInvalidAppNameLength', { length: appName.length }));
            expect(output).toContain(t('deploy.abapInvalidAppName', { prefix }));
            expect(output).toContain(t('deploy.charactersForbiddenInAppName'));
        });

        test('validateAppName - app name undefined', () => {
            const output = validateAppName(undefined as any);
            expect(output).toContain(t('deploy.abapAppNameRequired'));
        });
    });

    describe('validateAppDescription', () => {
        test('validateAppDescription - valid description', () => {
            const output = validateAppDescription('This is a description');
            expect(output).toEqual(true);
        });

        test('validateAppDescription - invalid description', () => {
            const output = validateAppDescription(
                'This is a loooooooooooooooooooooooooooooooooooooooooooooooooooooooog description'
            );
            expect(output).toContain(t('deploy.abapAppDescLength'));
        });
    });

    describe('validateTransportRequestNumber', () => {
        test('validateTransportRequestNumber - valid tr', () => {
            const output = validateTransportRequestNumber('T0000001', 'XPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - valid empty tr for local package $', () => {
            const output = validateTransportRequestNumber('', '$TMP');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - valid undefined tr for local package $', () => {
            const output = validateTransportRequestNumber(undefined as any, '$TMP');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - valid empty tr for local package T', () => {
            const output = validateTransportRequestNumber('', 'TPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - valid empty tr for local package t', () => {
            const output = validateTransportRequestNumber('', 'tPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - valid empty tr for local package L', () => {
            const output = validateTransportRequestNumber('', 'LPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - valid empty tr for local package l', () => {
            const output = validateTransportRequestNumber('', 'lPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - tr ignored for local package prefix $', () => {
            const output = validateTransportRequestNumber('T0000001', '$TMP');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - tr ignored for local package prefix T', () => {
            const output = validateTransportRequestNumber('T0000001', 'TPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - tr ignored for local package prefix t', () => {
            const output = validateTransportRequestNumber('T0000001', 'tPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - tr ignored for local package prefix L', () => {
            const output = validateTransportRequestNumber('T0000001', 'LPACKAGE');
            expect(output).toEqual(true);
        });

        test('validateTransportRequestNumber - tr ignored for local package prefix l', () => {
            const output = validateTransportRequestNumber('T0000001', 'lPACKAGE');
            expect(output).toEqual(true);
        });
    });

    describe('validatePackage', () => {
        test('validatePackage - valid package', () => {
            const output = validatePackage('$TMP');
            expect(output).toEqual(true);
        });

        test('validatePackage - invali package if undefined', () => {
            const output = validatePackage(undefined as any);
            expect(output).toContain(t('deploy.abapPackageWarn'));
        });

        test('validatePackage - invali package if empty', () => {
            const output = validatePackage('');
            expect(output).toContain(t('deploy.abapPackageWarn'));
        });
    });
});
