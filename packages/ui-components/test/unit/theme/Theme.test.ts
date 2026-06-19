import { jest } from '@jest/globals';
const { createTheme: mockCreateTheme, loadTheme: _mockLoadTheme } = await (async () => {
    const actual = await import('@fluentui/react');
    const mocked = {
        ...actual,
        createTheme: jest.fn(actual.createTheme),
        loadTheme: jest.fn()
    };
    jest.unstable_mockModule('@fluentui/react', () => mocked);
    return mocked;
})();

const { initTheme } = await import('../../../src/index.tsx');

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
