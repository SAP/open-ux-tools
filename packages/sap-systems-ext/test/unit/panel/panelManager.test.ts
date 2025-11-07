import { PanelManager } from '../../../src/panel';

describe('Test the Panel Manager', () => {
    it('should manage the panels using the exposed methods', () => {
        const panelManager = new PanelManager<{ dispose: jest.Mock }>();

        const mockDispose = jest.fn();
        const mockPanel = { dispose: mockDispose };

        expect(panelManager.has('test')).toBe(false);
        expect(panelManager.get('test')).toBeUndefined();

        panelManager.set('test', mockPanel);
        expect(panelManager.has('test')).toBe(true);
        expect(panelManager.get('test')).toBe(mockPanel);

        panelManager.deleteAndDispose('test');
        expect(mockDispose).toHaveBeenCalled();
        expect(panelManager.has('test')).toBe(false);
        expect(panelManager.get('test')).toBeUndefined();

        const factory = jest.fn(() => mockPanel);
        const panel1 = panelManager.getOrCreateNewPanel('test', factory);
        expect(factory).toHaveBeenCalled();
        expect(panel1).toBe(mockPanel);
        expect(panelManager.has('test')).toBe(true);

        const panel2 = panelManager.getOrCreateNewPanel('test', factory);
        expect(factory).toHaveBeenCalledTimes(1);
        expect(panel2).toBe(mockPanel);
    });
});
