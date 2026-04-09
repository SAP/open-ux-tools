const { createTheme: mockCreateTheme, loadTheme: mockLoadTheme } = await (async () => {
    const actual = await import('@fluentui/react');
    const mocked = {
        ...actual,
        createTheme: jest.fn(actual.createTheme),
        loadTheme: jest.fn()
    };
    jest.unstable_mockModule('@fluentui/react', () => mocked);
    return mocked;
})();

const { initTheme } = await import('../../../src/index.js');

describe('initTheme', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('initTheme', () => {
        initTheme();
        expect(mockCreateTheme).toHaveBeenCalledWith({
            defaultFontStyle: {
                WebkitFontSmoothing: '',
                fontFamily: 'var(--vscode-font-family)'
            }
        });
    });
});
