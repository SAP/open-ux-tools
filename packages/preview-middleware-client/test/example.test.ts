import Button from 'sap/m/Button';
// import ManagedObject from 'sap/ui/base/ManagedObject';
// import JSONModel from 'sap/ui/model/json/JSONModel';

describe('Test model modification', function () {
    // var oAppController, oViewStub, oGetViewMock, oJSONModelStub;
    // beforeEach(function () {
    //     oAppController = new AppController();
    //     oViewStub = new ManagedObject({});
    //     oGetViewMock = jest.fn().mockImplementation(function () {
    //         return oViewStub;
    //     });
    //     oAppController.getView = oGetViewMock;
    //     oJSONModelStub = new JSONModel({
    //         todos: []
    //     });
    //     oViewStub.setModel(oJSONModelStub);
    // });

    // afterEach(function () {
    //     oGetViewMock.mockClear();
    // });

    // test('It can load the todo from an url', async function () {
    //     jestUI5.mockUrl(
    //         '/myTodos.json',
    //         JSON.stringify([
    //             {
    //                 title: 'Start this app',
    //                 completed: false
    //             },
    //             {
    //                 title: 'Write a blog post',
    //                 completed: false
    //             }
    //         ])
    //     );
    //     const jsonModel = new JSONModel();
    //     await jsonModel.loadData('/myTodos.json');
    //     expect(jsonModel.getObject('/').length).toEqual(2);
    // });

    test('can mock a class', () => {
        const button = new Button();
        // expect(button.doSomething()).toBe('Button was clicked');
    });
});
