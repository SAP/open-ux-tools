sap.ui.define(
    ['sap/ui/base/ManagedObject', 'sap/ui/demo/todo/controller/App.controller', 'sap/ui/model/json/JSONModel'],
    function(ManagedObject, AppController, JSONModel) {
        'use strict';
        describe('Test model modification', function() {
            var oAppController, oViewStub, oGetViewMock, oJSONModelStub;
            beforeEach(function() {
                oAppController = new AppController();
                oViewStub = new ManagedObject({});
                oGetViewMock = jest.fn().mockImplementation(function() {
                    return oViewStub;
                });
                oAppController.getView = oGetViewMock;
                oJSONModelStub = new JSONModel({
                    todos: []
                });
                oViewStub.setModel(oJSONModelStub);
            });

            afterEach(function() {
                oGetViewMock.mockClear();
            });

            test(
                'Should add a todo element to the model',
                function() {
                    // Arrange
                    // initial assumption: to-do list is empty
                    expect(oJSONModelStub.getObject('/todos').length).toEqual(0);

                    // Act
                    oJSONModelStub.setProperty('/newTodo', 'new todo item');
                    oAppController.addTodo();

                    // Assumption
                    expect(oJSONModelStub.getObject('/todos').length).toEqual(1);
                }
            );

            test.each(['$', '/', '  '])('Add Todo with special characters', function(todo) {
                var length = oJSONModelStub.getObject('/todos').length;

                // Act
                oJSONModelStub.setProperty('/newTodo', todo);
                oAppController.addTodo();

                // Assumption
                var newTodo = oJSONModelStub.getObject('/todos/' + length);
                expect(newTodo).toBeDefined();
                expect(newTodo.title).toBe(todo);
                expect(oJSONModelStub.getObject('/todos').length).toEqual(length + 1);
            });

            it(
                'Should toggle the completed items in the model',
                function() {
                    // Arrange
                    var oModelData = {
                        todos: [
                            {
                                title: 'Start this app',
                                completed: false
                            }
                        ],
                        itemsLeftCount: 1
                    };
                    oJSONModelStub.setData(oModelData);

                    // initial assumption
                    expect(oJSONModelStub.getObject('/todos').length).toEqual(1);
                    expect(oJSONModelStub.getProperty('/itemsLeftCount')).toEqual(1);

                    // Act
                    oJSONModelStub.setProperty('/todos/0/completed', true);
                    oAppController.updateItemsLeftCount();

                    // Assumption
                    expect(oJSONModelStub.getProperty('/itemsLeftCount')).toEqual(0);
                }
            );

            it('Should clear the completed items', function() {
                // Arrange
                var oModelData = {
                    todos: [
                        {
                            title: 'Start this app1',
                            completed: false
                        },
                        {
                            title: 'Start this app2',
                            completed: true
                        }
                    ],
                    itemsLeftCount: 1
                };
                oJSONModelStub.setData(oModelData);

                // initial assumption
                expect(oJSONModelStub.getObject('/todos').length).toEqual(2);
                expect(oJSONModelStub.getProperty('/itemsLeftCount')).toEqual(1);

                // Act
                oAppController.clearCompleted();
                oAppController.updateItemsLeftCount();

                // Assumption
                expect(oJSONModelStub.getObject('/todos').length).toEqual(1);
                expect(oJSONModelStub.getProperty('/itemsLeftCount')).toEqual(1);
            });

            it('Should update items left count when no todos are loaded, yet', function() {
                // Arrange
                var oModelData = {};
                oJSONModelStub.setData(oModelData);

                // initial assumption
                expect(oJSONModelStub.getObject('/todos')).toEqual(undefined);
                expect(oJSONModelStub.getProperty('/itemsLeftCount')).toEqual(undefined);

                // Act
                oAppController.updateItemsLeftCount();

                // Assumption
                expect(oJSONModelStub.getProperty('/itemsLeftCount')).toEqual(0);
            });
        });
    }
);
