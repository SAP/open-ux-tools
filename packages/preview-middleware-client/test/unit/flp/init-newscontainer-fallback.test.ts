import NewsAndPagesContainer from 'sap/cux/home/NewsAndPagesContainer';

jest.unstable_mockModule('sap/cux/home/NewsContainer', () => {
    throw new Error('NewsContainer not found');
});

import MyHomeController from '../../../src/flp/homepage/controller/MyHome.controller';

describe('flp/init - NewsContainer fallback', () => {
    test('enhancedHomePage view - fallback to NewsAndPagesContainer control when NewsContainer is not available', (done) => {
        const mockPage = {
            insertContent: jest.fn()
        };

        const controller = new MyHomeController('testController');
        controller.getView = jest.fn().mockReturnValue({
            getId: jest.fn().mockReturnValue('testView'),
            byId: jest.fn().mockReturnValue(mockPage)
        });

        controller.onInit();
        setTimeout(() => {
            expect(mockPage.insertContent).toHaveBeenCalled();
            const insertedContainer = mockPage.insertContent.mock.calls[0][0];

            expect(insertedContainer).toBeInstanceOf(NewsAndPagesContainer);
            expect(mockPage.insertContent).toHaveBeenCalledWith(insertedContainer, 0);
            done();
        });
    });
});
