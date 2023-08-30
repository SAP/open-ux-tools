import AddFragment from '../../../../../src/preview/client/controllers/AddFragment.controller';

describe('AddFragment', () => {
    describe('onInit', () => {
        test('fills json model with data', async () => {
            const addFragment = new AddFragment('adp.extension.controllers.AddFragment');
            await addFragment.onInit();
        });
    });
});
