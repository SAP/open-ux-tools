describe('FeatureService', () => {
    afterEach(() => {
        jest.resetModules();
    });

    function setFeatureToggles(featureNames: string[]) {
        const features = featureNames.map((feature) => ({
            feature,
            isEnabled: true
        }));
        const bootstrap = document.createElement('div');
        bootstrap.setAttribute('id', 'sap-ui-bootstrap');
        bootstrap.setAttribute('data-open-ux-preview-features', JSON.stringify(features));
        document.body.appendChild(bootstrap);
    }

    test('not enabled feature', async () => {
        const { FeatureService } = await import('../../../src/cpe/feature-service');
        expect(FeatureService.isFeatureEnabled('test.feature')).toStrictEqual(false);
    });

    test('enabled feature', async () => {
        setFeatureToggles(['test.feature']);
        const { FeatureService } = await import('../../../src/cpe/feature-service');
        expect(FeatureService.isFeatureEnabled('test.feature')).toStrictEqual(true);
    });
});
