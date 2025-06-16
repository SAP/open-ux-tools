describe('integration: validateFioriAppTargetFolder calls validateWindowsPathLength', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('should call validateWindowsPathLength when validating target folder', () => {
        const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

        jest.doMock('../src/i18n', () => ({ t: () => 'error' }));
        jest.doMock('../src/ui5/validators', () => ({ validateProjectFolder: () => true }));
        jest.doMock('../src/general/project-path-validators', () => {
            const actual = jest.requireActual('../src/general/project-path-validators');
            return {
                ...actual,
                validateWindowsPathLength: jest.fn(() => true)
            };
        });

        return new Promise<void>((resolve, reject) => {
            jest.isolateModules(() => {
                import('../src/general/project-path-validators')
                    .then((projectValidators) => {
                        const spy = projectValidators.validateWindowsPathLength as jest.Mock;
                        const longTarget = 'C:'.padEnd(253, 'a');
                        const name = 'project1';
                        return projectValidators.validateFioriAppTargetFolder(longTarget, name, true).then(() => {
                            expect(spy).toHaveBeenCalled();
                            if (originalPlatform) {
                                Object.defineProperty(process, 'platform', originalPlatform);
                            }
                            resolve();
                        });
                    })
                    .catch(reject);
            });
        });
    });
});
