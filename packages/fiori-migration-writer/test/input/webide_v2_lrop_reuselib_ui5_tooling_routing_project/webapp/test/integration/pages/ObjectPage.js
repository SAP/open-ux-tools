sap.ui.define(
    [
        'sap/ui/test/Opa5',
        'i2d/qm/defect/records1/test/integration/pages/Common',
        'sap/ui/test/actions/Press',
        'sap/ui/model/resource/ResourceModel',
        'sap/ui/test/matchers/Interactable',
        //"i2d/mpe/cercode/manages1/test/integration/LrepMockdataLoaded"
        'sap/ui/test/actions/EnterText',
        'sap/m/Dialog',
        'sap/m/MessageBox'
        //"i2d/qm/defect/records1/webapp/ext/control/SmartLongText"
    ],
    function (Opa5, Common, Press, ResourceModel, Interactable, EnterText, Dialog, MessageBox) {
        'use strict';

        Opa5.extendConfig({
            appParams: {
                'sap-ui-animation': false
            }
        });

        Opa5.createPageObjects({
            onTheObjectPage: {
                actions: {
                    iEnterTaskDetailedDescription: function (sDialogId, sFieldId) {
                        return this.waitFor({
                            searchOpenDialogs: true,
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            timeout: 30,

                            actions: new EnterText({ text: 'Task Created by OPA' }),

                            matchers: function (oField) {
                                if (oField.getId() === sDialogId + '--' + sFieldId) {
                                    return true;
                                } else {
                                    return false;
                                }
                            },
                            /*
						check: function(aFields) {
							return true;
						},
						success: function(aFields) {
							Opa5.assert.ok(true, "Text Entered");
						},*/
                            errorMessage: 'Did not find the Field'
                        });
                    },

                    iPressDialogButton: function (buttonName) {
                        this.waitFor({
                            timeout: 30,
                            searchOpenDialogs: true,
                            controlType: 'sap.m.Button',

                            actions: new Press(),

                            matchers: function (oButton) {
                                if (oButton.getText() === buttonName) {
                                    return true;
                                }
                                return false;
                            },
                            /*
						check: function(aButtons) {
							return true;
						},

						success: function() {
							Opa5.assert.ok(true, "Button " + buttonName + " pressed");
						},*/
                            errorMessage: 'Did not find the Order Now button'
                        });
                        return this;
                    },

                    /*
				iClickTheEditButtonInTaskTable: function(index){
					this.waitFor({
						id: "i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet2::responsiveTable",
						pollingInterval: 100,
						timeout: 30,
						autoWait: true,

						check: function(oTaskTable) {
							var aTaskTableItems = oTaskTable.getItems();
			
							if(aTaskTableItems[index] && aTaskTableItems[index].getProperty("type") !== "Detail")
								return true;
							return true;
						},
						success: function(oTaskTable) {
							//trigger the detailPress 
							oTaskTable.getItems()[index].fireDetailPress();
							Opa5.assert.ok(true, "detailPress Event fired"); //using the fire event does not work correct in test execution
						},
						errorMessage: "Task Table not detected!"
					});
					return this;
				},*/

                    iEnterTheValueInTheDialogField: function (iField, iValue) {
                        return this.waitFor({
                            searchOpenDialogs: true,
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oField) {
                                if (oField.getId().match(new RegExp(iField))) return true;
                                return false;
                            },

                            actions: new EnterText({ text: iValue }),
                            /*
						check: function(aFields) {
							return true;
						},
						success: function(oField) {
							Opa5.assert.ok(true, "Field Value filled");
						},*/
                            errorMessage: 'Did not find the Field'
                        });
                    },

                    iEnterTheValueInTheSmartField: function (iField, iValue) {
                        return this.waitFor({
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oField) {
                                if (oField.getId().match(new RegExp(iField))) return true;
                                return false;
                            },

                            actions: new EnterText({ text: iValue }),
                            /*
						check: function(aFields) {
							return true;
						},
						success: function(oField) {
							Opa5.assert.ok(true, "Field Value filled");
						},*/
                            errorMessage: 'Did not find the Field'
                        });
                    },

                    iEnterADefectDetailedDescription: function (iField, iValue) {
                        return this.waitFor({
                            controlType: 'i2d.qm.defect.records1.ext.control.SmartLongText',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oField) {
                                if (oField.getId().match(new RegExp(iField))) return true;
                                return false;
                            },

                            actions: new EnterText({ text: iValue }),
                            /*
						check: function(aFields) {
							return true;
						},
						success: function(oField) {
							Opa5.assert.ok(true, "Field Value filled");
						},*/
                            errorMessage: 'Did not find the Field'
                        });
                    },

                    iWaitForSomeTime: function (iField) {
                        /*var WaitAction = sap.ui.test.actions.Action.extend("WaitWaction",{
					executeOn: function(){
						
					}
				});*/

                        return this.waitFor({
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            id: iField,
                            timeout: 10,
                            autoWait: true,
                            actions: function (x) {}
                        });
                    },

                    iPressInTheCodeField: function (iField) {
                        return this.waitFor({
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oField) {
                                if (oField.getId().match(new RegExp(iField))) return true;
                                return false;
                            },

                            actions: new Press(),
                            errorMessage: 'Did not find the Field'
                        });
                    }
                },
                assertions: {
                    iShouldSeeMsgToast: function (expectedMsg) {
                        var text = null;

                        this.waitFor({
                            pollingInterval: 100,
                            timeout: 30,

                            check: function () {
                                text = sap.ui.test.Opa5.getJQuery()('.sapMMessageToast').text();
                                if (text === expectedMsg) {
                                    return true;
                                } else {
                                    return false;
                                }
                            },
                            success: function () {
                                Opa5.assert.strictEqual(text, expectedMsg);
                            },
                            errorMessage: 'No Toast message detected!'
                        });
                        return this;
                    },
                    /*
				iShouldSeeTheDataFieldOnTheDialog: function(sDialogId, sFieldId) {
					this.waitFor({
						pollingInterval: 100,
						timeout: 30,
						searchOpenDialogs: true,
						controlType: "sap.ui.comp.smartfield.SmartField",

						matchers: function(oField) { 
							if (oField.getId() === sDialogId + "--" + sFieldId) {
							  return true;
							} else {
							  return false;
							}
						},
						check: function(aFields) {
                            if (aFields[0].getProperty("visible")) {
                            	return true;
                            } 
                            else {
                            	return false;
                            }
						},
						
						success: function(aFields) {
							Opa5.assert.ok(true, "Field '" + sFieldId + "' found on dialog '" + sDialogId + "'");
						},
						errorMessage: "Did not find the Field '" + sFieldId + "' on dialog '" + sDialogId + "'"
					});
					return this;
				},
				
				iShouldSeeTheTextAreaFieldOnTheDialog: function(sDialogId, sFieldId) {
					this.waitFor({
						pollingInterval: 100,
						timeout: 30,
						searchOpenDialogs: true,
						controlType: "sap.m.TextArea",

						matchers: function(oField) { 
							if (oField.getId() === sDialogId + "--" + sFieldId) {
							  return true;
							} else {
							  return false;
							}
						},
						check: function(aFields) {
                            if (aFields[0].getProperty("visible")) {
                            	return true;
                            } 
                            else {
                            	return false;
                            }
						},
						
						success: function(aFields) {
							Opa5.assert.ok(true, "Field '" + sFieldId + "' found on dialog '" + sDialogId + "'");
						},
						errorMessage: "Did not find the Field '" + sFieldId + "' on dialog '" + sDialogId + "'"
					});
					return this;
				},
				
				iShouldSeeTheEditButtonInTaskTable: function(){
					this.waitFor({
						id: "i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet2::responsiveTable",
						//controlType: "sap.m.Table",
						pollingInterval: 100,
						timeout: 30,
						autoWait: true,

						check: function(oTaskTable) {
							var aTaskTableItems = oTaskTable.getItems();
			
							for(var i = 0; i < aTaskTableItems.length;i++){
								//if the type of each line item is sap.m.ListType.Detail (="Detail"= we can conclude that the edit button is displayed
								if(aTaskTableItems[i].getProperty("type") !== "Detail")
									return false;
							}
							return true;
						},
						success: function() {
							Opa5.assert.ok(true, "Task Table and Edit Button detected");
						},
						errorMessage: "Task Table not detected!"
					});
					return this;
				},
				
				iShouldSeeTheChevronInTaskTable: function(){
					this.waitFor({
						id: "i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet2::responsiveTable",
						//controlType: "sap.m.Table",
						pollingInterval: 100,
						timeout: 30,
						autoWait: true,

						check: function(oTaskTable) {
							var aTaskTableItems = oTaskTable.getItems();
			
							for(var i = 0; i < aTaskTableItems.length;i++){
								//if the type of each line item is sap.m.ListType.Detail (="Detail"= we can conclude that the edit button is displayed
								if(aTaskTableItems[i].getProperty("type") !== "Navigation")
									return false;
							}
							return true;
						},
						success: function() {
							Opa5.assert.ok(true, "Task Table and Navigation Type detected");
						},
						errorMessage: "Task Table not detected!"
					});
					return this;
				},
				
				iSeeTheFieldHasValue: function(iField, iValue){
					return this.waitFor({
						searchOpenDialogs: true,
						controlType: "sap.ui.comp.smartfield.SmartField",
						timeout: 30,
						autoWait: true,
						
						matchers: function(oField){
							if( oField.getId().match(new RegExp(iField)) )
								return true;
							return false;
						},
						
						check: function(aFields) {
							if(aFields[0])
								return true;
							return false;
						},
						success: function(aFields) {
							Opa5.assert.strictEqual(aFields[0].getValue(), iValue);
						},
						errorMessage: "The field does not show the correct value"
					});
				},
				*/

                    iSeeTheFieldHasValueState: function (iField, iValueState, iValueStateText) {
                        return this.waitFor({
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oField) {
                                if (
                                    oField.getId().match(new RegExp(iField)) &&
                                    oField.getInnerControls()[0].getValueState() === iValueState &&
                                    oField.getInnerControls()[0].getValueStateText() === iValueStateText
                                )
                                    return true;
                                return false;
                            },

                            check: function (aFields) {
                                if (aFields[0]) return true;
                                return false;
                            },
                            success: function (aFields) {
                                if (aFields.length <= 0)
                                    Opa5.assert.ok(false, 'The field does not show the correct value state');

                                Opa5.assert.strictEqual(aFields[0].getInnerControls()[0].getValueState(), iValueState);
                                Opa5.assert.strictEqual(
                                    aFields[0].getInnerControls()[0].getValueStateText(),
                                    iValueStateText
                                );
                            },
                            errorMessage: 'The field does not show the correct value state'
                        });
                    },

                    iShouldSeeTheMessageBox: function () {
                        return this.waitFor({
                            searchOpenDialogs: true,
                            controlType: 'sap.m.Dialog',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oMessageBox) {
                                if (oMessageBox.getType() === sap.m.DialogType.Message) return true;
                                return false;
                            },

                            check: function (aMessageBoxes) {
                                return true;
                            },
                            success: function (aMessageBoxes) {
                                if (aMessageBoxes.length > 1) Opa5.assert.ok(false, 'More than 1 error box was found');
                                if (aMessageBoxes.length <= 0) Opa5.assert.ok(false, 'No message box was found');

                                Opa5.assert.strictEqual(aMessageBoxes[0].getType(), sap.m.DialogType.Message);
                            },
                            errorMessage: 'The message box was not found'
                        });
                    },

                    iShouldSeeTheDefectCodeProposals: function (iField) {
                        return this.waitFor({
                            controlType: 'sap.ui.comp.smartfield.SmartField',
                            timeout: 30,
                            autoWait: true,

                            matchers: function (oField) {
                                if (
                                    oField.getId().match(new RegExp(iField))
                                    //&& oField.getValueState() === iValueState
                                    /*&& oField.getValueStateText() === iValueStateText*/
                                )
                                    return true;
                                return false;
                            },

                            check: function (aFields) {
                                if (aFields[0]) return true;
                                return false;
                            },
                            success: function (aFields) {
                                if (aFields.length <= 0)
                                    Opa5.assert.ok(false, 'The field does not show the correct value state');

                                //Opa5.assert.strictEqual(aFields[0].getValueState(), iValueState);
                                //Opa5.assert.strictEqual(aFields[0].getValueStateText(), iValueStateText);
                            },
                            errorMessage: 'The field does not show the correct value state'
                        });
                    }
                }
            }
        });
    }
);
