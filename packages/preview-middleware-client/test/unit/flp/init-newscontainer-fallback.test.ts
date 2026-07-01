import { jest } from '@jest/globals';
import NewsAndPagesContainer from 'sap/cux/home/NewsAndPagesContainer';

jest.unstable_mockModule('sap/cux/home/NewsContainer', () => {
    throw new Error('NewsContainer not found');
});

import MyHomeController from '../../../src/flp/homepage/controller/MyHome.controller.js';

describe('flp/init - NewsContainer fallback', () => {
    test('enhancedHomePage view - fallback to NewsAndPagesContainer control when NewsContainer is not available', (done) => {
        const mockPage = {
            insertContent: jest.fn()
        };

        const controller = new MyHomeController('testController');
        const homepageController = controller as MyHomeController & {
            setupSystemInfoBar: () => void;
            initSalutationBar: () => Promise<void>;
            initializeInsightsContainer: () => Promise<void>;
            fetchWarnings: () => Promise<void>;
        };
        jest.spyOn(homepageController, 'setupSystemInfoBar').mockImplementation(() => undefined);
        jest.spyOn(homepageController, 'initSalutationBar').mockResolvedValue(undefined);
        jest.spyOn(homepageController, 'initializeInsightsContainer').mockResolvedValue(undefined);
        jest.spyOn(homepageController, 'fetchWarnings').mockResolvedValue(undefined);
        controller.getView = jest.fn().mockReturnValue({
            getId: jest.fn().mockReturnValue('testView'),
            createId: jest.fn((id: string) => `testView--${id}`),
            setModel: jest.fn(),
            getModel: jest.fn().mockReturnValue({
                getResourceBundle: jest.fn().mockReturnValue({ getText: jest.fn().mockReturnValue('') }),
                getProperty: jest.fn(),
                setProperty: jest.fn()
            }),
            byId: jest.fn().mockReturnValue(mockPage)
        });

        controller.onInit();
        setTimeout(() => {
            expect(mockPage.insertContent).toHaveBeenCalled();
            const insertedContainer = mockPage.insertContent.mock.calls[0][0];

            expect(insertedContainer).toBeInstanceOf(NewsAndPagesContainer);
            expect(mockPage.insertContent).toHaveBeenCalledWith(insertedContainer, 1);
            done();
        });
    });
});
