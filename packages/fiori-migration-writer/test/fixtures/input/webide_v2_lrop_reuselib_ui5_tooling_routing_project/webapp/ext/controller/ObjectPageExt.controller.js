sap.ui.define(
    [
        'i2d/qm/defect/records1/ext/control/SmartLongText',
        'i2d/qm/defect/records1/ext/utilities/DefectCategoryDependentUIElements'
    ],
    function (SmartLongText, DefcatDepUIElms) {
        'use strict';

        var ObjectPageExt = sap.ui.controller('i2d.qm.defect.records1.ext.controller.ObjectPageExt', {
            /************************************************************************************************************************************/
            /* general helper functions     */
            showMessageToast: function (iMessageResource) {
                var message = this.getOwnerComponent().getModel('i18n').getResourceBundle().getText(iMessageResource);
                sap.m.MessageToast.show(message);
            },

            showErrorBox: function (iMessageResource, aMessageVarArgs) {
                var message = this.getOwnerComponent()
                    .getModel('i18n')
                    .getResourceBundle()
                    .getText(iMessageResource, aMessageVarArgs);
                sap.m.MessageBox.error(message);
            },

            showInformationBox: function (iMessageResource) {
                var message = this.getOwnerComponent().getModel('i18n').getResourceBundle().getText(iMessageResource);
                sap.m.MessageBox.information(message);
            },
            /************************************************************************************************************************************/
            /* helper functions for task create and edit dialogs     */
            isDefectSaved: function () {
                var vDefectHasActiveEntity = this.getView().getBindingContext().getProperty('HasActiveEntity');
                var vDefectIsActiveEntity = this.getView().getBindingContext().getProperty('IsActiveEntity');
                return vDefectHasActiveEntity || vDefectIsActiveEntity;
            },
            /* create task */
            onClickActionCreateTask: function (oEvent) {
                //check that defect was saved at least once!
                if (!this.isDefectSaved()) {
                    this.showErrorBox('MSG_TEXT_DEFECT_NOT_SAVED');
                    return;
                }

                /* Extract the three values for parameter to trigger intent based navigation */
                var oComponent = this.getOwnerComponent();
                var oContext = oComponent.getBindingContext();
                var oDataModel = this.getView().getModel();

                /* Get Value of Key Field */
                var vDefectInternalD = oDataModel.getProperty('DefectInternalID', oContext);
                var vQualityTaskOrigin = '01';

                /* Simple parameters as Object */
                var vNavigationParameters = {
                    DefectInternalID: vDefectInternalD,
                    QualityTaskOrigin: vQualityTaskOrigin,
                    preferredMode: 'create'
                };

                /* Trigger intent based navigation */
                var oApi = this.extensionAPI;
                var oNavController = oApi.getNavigationController();
                /* Trigger intent based navigation */
                oNavController.navigateExternal('outCreateQTask', vNavigationParameters);
            },

            /* Table AffectedObjects: Add new line or determine affected objects */
            onClickActionAddAffectedObject: function (oEvent) {
                var vAddAffObjFunctionName = '';
                switch (oEvent.getSource().getId()) {
                    case 'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--AddAffectedObject':
                        // Action for adding one single new line into table
                        vAddAffObjFunctionName =
                            'QM_DEFECT_RECORD_SRV.QM_DEFECT_RECORD_SRV_Entities/C_DefectRecordAdd_affected_object';
                        break;
                    case 'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DetermineAffectedObjects':
                        // Action for trigger the determining of several new affected objects
                        vAddAffObjFunctionName =
                            'QM_DEFECT_RECORD_SRV.QM_DEFECT_RECORD_SRV_Entities/C_DefectRecordDetermine_affected_objects';
                        break;
                    default:
                        // Id unknown
                        return;
                }
                var oBindingContext = this.getView().getBindingContext();
                var oActionParameters = { 'Defectaffectedobjecttype': '01' };

                this.extensionAPI
                    .securedExecution(
                        function () {
                            return this.extensionAPI.invokeActions(
                                vAddAffObjFunctionName,
                                oBindingContext,
                                oActionParameters
                            );
                        }.bind(this)
                    ) // returns a promise
                    .then(function (oResponse) {}.bind(this))

                    .catch(function (oResponse) {
                        // there is also nothing to do if the promise fails: error messages are displayed automatically
                    });
                // register execution of side-effect; the side-effect is defined via annotations
                this.extensionAPI.getTransactionController().executeSideEffects({
                    sourceEntities: [vAddAffObjFunctionName]
                });
            },

            /* Table Affected Objects: Select one single affected object as defective */
            onClickActionAffectedObjectSelectAsDefective: function (oEvent) {
                // Action for selecting one affected object as the defective one
                var vAffObjFunctionName =
                    'QM_DEFECT_RECORD_SRV.QM_DEFECT_RECORD_SRV_Entities/A29975663DC1E15EC41F30DE8Set_isdefective';

                //check if one single affected object is selected
                var aAffectedObjectsSelectedContexts = this.getView()
                    .byId('AffectedObjectsSmartTable')
                    .getTable()
                    .getSelectedContexts();
                if (aAffectedObjectsSelectedContexts.length !== 1) {
                    // error -> exactly one affected objects must be selected
                    this.showErrorBox('AFFECTED_OBJECTS_ACT_REQU_SINGLE_SEL', oEvent.getSource().getText());
                    return;
                }
                // Create a Context with the path of the one selected entry from the table (hint: therefore some properties in 'requestAtLeastFields' are necessary)
                var oBindingContext = new sap.ui.model.Context(
                    this.getView().getModel(),
                    aAffectedObjectsSelectedContexts[0].getPath()
                );

                this.extensionAPI
                    .securedExecution(
                        function () {
                            return this.extensionAPI.invokeActions(vAffObjFunctionName, oBindingContext); //, oActionParameters);
                        }.bind(this)
                    ) // returns a promise
                    .then(function (oResponse) {}.bind(this))

                    .catch(function (oResponse) {
                        // there is also nothing to do if the promise fails: error messages are displayed automatically
                    });
                // register execution of side-effect; the side-effect is defined via annotations
                this.extensionAPI.getTransactionController().executeSideEffects({
                    sourceEntities: [vAffObjFunctionName]
                });
                // remove line selection, as this is some kind of 'one click' action
                this.getView().byId('AffectedObjectsSmartTable').getTable().removeSelections(true);
            },

            /************************************************************************************************************************************/
            /* edit task */
            onClickActionEditTask: function (oEvent, oData) {
                //determine selected task
                var vPressedRowIndex = oData.index; //the index of the pressed row was stored in the oData object when the event handler was attached
                var oTaskTable = oEvent.getSource().getParent();
                var oModel = oTaskTable.getModel();
                var aTaskTableItems = oTaskTable.getItems();
                //get data of selected task
                var vQualityTask = oModel.getProperty(
                    'QualityTask',
                    aTaskTableItems[vPressedRowIndex].getBindingContext()
                );

                /* Simple parameters as Object */
                var vNavigationParameters = {
                    QualityTask: vQualityTask,
                    preferredMode: 'edit'
                };

                var oApi = oData.this.extensionAPI;
                var oNavController = oApi.getNavigationController();
                /* Trigger intent based navigation */
                oNavController.navigateExternal('outboundEditDisplayQualityTask', vNavigationParameters);
            },
            /* display task */
            onListNavigationExtension: function (oEvent) {
                var oBindingContext = oEvent.getSource().getBindingContext();
                var oTask = oBindingContext.getObject();

                /* Simple parameters as Object */
                var vNavigationParameters = {
                    QualityTask: oTask.QualityTask,
                    preferredMode: 'display'
                };

                var oApi = this.extensionAPI;
                var oNavController = oApi.getNavigationController();
                /* Trigger intent based navigation */
                oNavController.navigateExternal('outboundEditDisplayQualityTask', vNavigationParameters);
                return true;
            },
            /************************************************************************************************************************************/
            /* application init     */
            onInit: function (oEvent) {
                this.initTextFields();
                this.initDefectLongTextCustom();
                this.initDefectCode();
                this.extensionAPI.attachPageDataLoaded(jQuery.proxy(this.handleTaskTabEditState, this));

                this.initAffcdObjTab();
                this.initChangeDocumentVisibility();
                this.initOutputManagementVisibility();
                //set up an event handler to determine and save if edit mode is on or off
                var that = this;
                this.extensionAPI.attachPageDataLoaded(function (ooEvent) {
                    that.isEditable = !ooEvent.context.getProperty('IsActiveEntity');
                    that.vDefectInternalID = ooEvent.context.getProperty('DefectInternalID');
                    that.getView()
                        .byId(
                            'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectAttachments::Section'
                        )
                        .getSubSections()[0]
                        .setVisible(false);
                });

                //set up an event handler to set up the task table
                var oTaskTable = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet2::responsiveTable'
                );
                //		oTaskTable.setProperty("mode", sap.m.ListMode.MultiSelect); // moved to onPageDataLoaded handler to switch it dynamically
                var fnUpdateTaskTable = function (event) {
                    //display the edit button on each line (aka 'Detail') if edit mode is enabled
                    var aTaskTableItems = oTaskTable.getItems();
                    var vIsEditable = oTaskTable.getModel('ui').getData().editable;
                    for (var i = 0; i < aTaskTableItems.length; i++) {
                        var vEdit_active_i_qualitytasktp_ac = aTaskTableItems[i]
                            .getModel()
                            .getProperty('Edit_active_i_qualitytasktp_ac', aTaskTableItems[i].getBindingContext());

                        if (aTaskTableItems[i] instanceof sap.m.GroupHeaderListItem) {
                            //if this header is a grouping line then deactive the navigation, this is the case if grouping is active
                            aTaskTableItems[i].setProperty('type', sap.m.ListType.Inactive);
                            continue;
                        }

                        if (vIsEditable && vEdit_active_i_qualitytasktp_ac) {
                            var oEventData = { 'index': i, 'this': that };
                            aTaskTableItems[i].setProperty('type', sap.m.ListType.Detail);
                            aTaskTableItems[i].detachDetailPress(that.onClickActionEditTask);
                            aTaskTableItems[i].attachDetailPress(oEventData, that.onClickActionEditTask);
                        } else {
                            aTaskTableItems[i].setProperty('type', sap.m.ListType.Navigation);
                        }
                    }

                    //we enbaled the 'Add Task' button here (after the table loaded completely) to prevent that the user can create more tasks than allowed
                    //-> new: button is only enabled when navigation is possible
                    //test if navigation to 'create task' is supported for current user
                    var vNavigationToProcessTaskCreateTestIntent = [
                        {
                            target: { semanticObject: 'QualityTask', action: 'process' },
                            params: {
                                DefectInternalID: that.vDefectInternalID,
                                QualityTaskOrigin: '01',
                                preferredMode: 'edit'
                            }
                        }
                    ];
                    var vNavigationToProcessTaskCreateIsSupported = sap.ushell.Container.getService(
                        'CrossApplicationNavigation'
                    ).isNavigationSupported(vNavigationToProcessTaskCreateTestIntent);
                    var oAddTaskButton = that
                        .getView()
                        .byId(
                            'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--ActionCreateTask'
                        );
                    oAddTaskButton.bindProperty('enabled', 'DefectLifecycleStatus', function (DefectLifecycleStatus) {
                        //if defect is COMPLETED OR NOT RELEVANT then no new tasks can be created
                        return DefectLifecycleStatus !== '20' && DefectLifecycleStatus !== '10';
                    });
                    vNavigationToProcessTaskCreateIsSupported.done(function (aResponses) {
                        //only change the enabled property if the navigation is not supported to keep the previously set binding
                        if (aResponses[0].supported === false) {
                            oAddTaskButton.setEnabled(aResponses[0].supported);
                        }
                    });
                };
                oTaskTable.attachUpdateFinished(fnUpdateTaskTable.bind(this));
                this.extensionAPI.attachPageDataLoaded(fnUpdateTaskTable.bind(this)); //we also need to refresh the table on PageDataLoaded because the ui model is not updated when UpdateFinished is fired

                // Collect IDs of Sections and FieldGroups depending on defect category
                DefcatDepUIElms.collectDependentUIElements(this.getView());
            },

            initTextFields: function () {
                var oDefectCode = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_2::DefectCode::Field'
                );
                if (oDefectCode && oDefectCode.getParent) {
                    var oDefectCodeText = new sap.ui.comp.smartfield.SmartField('DefectCodeText', {
                        value: '{to_DefectCode/DefectCode_Text}',
                        visible: '{= ${ui>/editable} && ${DefectCode_fc} === 3}'
                    });
                    oDefectCodeText.addStyleClass('sapUiTinyMarginBegin');
                    var oCodeGroupElem = oDefectCode.getParent();
                    oCodeGroupElem.addElement(oDefectCodeText);
                }

                var oDefectCodeGroup = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_2::DefectCodeGroup::Field'
                );
                if (oDefectCodeGroup && oDefectCodeGroup.getParent) {
                    var oDefectCodeGroupText = new sap.ui.comp.smartfield.SmartField('DefectCodeGroupText', {
                        value: '{to_DefectCodeGroup/DefectCodeGroup_Text}',
                        visible: '{= ${ui>/editable} && ${DefectCode_fc} === 3}'
                    });
                    oDefectCodeGroupText.addStyleClass('sapUiTinyMarginBegin');
                    var oCodeGroupGroupElem = oDefectCodeGroup.getParent();
                    oCodeGroupGroupElem.addElement(oDefectCodeGroupText);
                }
            },

            initDefectLongTextCustom: function () {
                //destroy the original defect long text field to avoid that it can be added to the UI in adaptation mode (we need to keep it in the annotations to make FE load it -> there is no extension to make FE load the value for us...)
                var oDefectDescOrg = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_1::to_DefectLongTextTP::DefectLongText::Field'
                );
                if (oDefectDescOrg) {
                    oDefectDescOrg.getParent().destroy();
                }

                //create custom control for defect long text and add it to the section group
                var oDefectDataFacet1_1_FormGroup = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_1::FormGroup'
                );
                var oCustomLongTextGroupElem = new sap.ui.comp.smartform.GroupElement(
                    this.getView().getId() + '--DefectDataFacet1_1::DefectLongTextCustom::GroupElement'
                );
                var oDescCustom = new i2d.qm.defect.records1.ext.control.SmartLongText(
                    this.getView().getId() + '--DefectDataFacet1_1::DefectLongTextCustom::Field',
                    {
                        value: '{to_DefectLongTextTP/DefectLongText}',
                        editable: '{= ${ui>/editable} && ${to_DefectLongTextTP/DefectLongText_fc} === 3 }',
                        customData: {
                            Type: 'sap.ui.core.CustomData',
                            key: 'multiLineSettings',
                            value: { rows: 4, width: '100%', growing: true, growingMaxLines: 10 }
                        }
                    }
                );
                oCustomLongTextGroupElem.addElement(oDescCustom);
                if (oDefectDataFacet1_1_FormGroup) {
                    oDefectDataFacet1_1_FormGroup.addFormElement(oCustomLongTextGroupElem);
                }

                oDescCustom.attachInnerControlsCreated(function (e) {
                    e.getSource().getInnerControls()[0].attachLiveChange(this.onDefectDefectLongTextLiveChange, this);
                }, this);
            },

            handleTaskTabEditState: function (oEvent) {
                var oTaskTable = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet2::responsiveTable'
                );
                var vIsEditable = oTaskTable.getModel('ui').getData().editable;
                if (vIsEditable) {
                    oTaskTable.setProperty('mode', sap.m.ListMode.MultiSelect);
                } else {
                    oTaskTable.setProperty('mode', sap.m.ListMode.None);
                }
            },

            onDefectDefectLongTextLiveChange: function (oEventLiveChange) {
                var vNewLongText = oEventLiveChange.getParameter('newValue');

                var oModel = this.getView().getModel();
                var vDefectCode = oModel.getProperty('DefectCode', this.getView().getBindingContext());
                if (vDefectCode !== '') {
                    //do not try to fetch defect code proposals if there already is a code set
                    return;
                }

                var fnSaveDefectLongTextDraft = jQuery.proxy(function () {
                    this.submitDefectLongTextChangesAndReadCodeProposals(vNewLongText);
                }, this);

                //register a timeout that triggers after 0.8 sec if there is no subsequent change which cancels it directly again
                if (this.currentTimeout) {
                    clearTimeout(this.currentTimeout);
                }
                this.currentTimeout = setTimeout(
                    jQuery.proxy(function () {
                        //if the timeout fires the user stopped typing for 0.8 sec -> save the changes
                        fnSaveDefectLongTextDraft();
                    }, this),
                    800
                );
            },

            submitDefectLongTextChangesAndReadCodeProposals: function (vNewLongText) {
                var oModel = this.getView().getModel();
                //register the long text change in the model
                oModel.setProperty(
                    'to_DefectLongTextTP/DefectLongText',
                    vNewLongText,
                    this.getView().getBindingContext()
                );
                //register reading the defect code proposals in the model
                this.readDefectCodeProposals();
                //execute
                oModel.submitChanges({
                    batchGroupId: 'Changes'
                });
            },

            readDefectCodeProposals: function () {
                var oModel = this.getView().getModel();
                var vDefectInternalID = oModel.getProperty('DefectInternalID', this.getView().getBindingContext());
                oModel.read('/C_DefectRecordCodeVH', {
                    batchGroupId: 'Changes',
                    urlParameters: { '$top': '10', '$skip': '0' },
                    filters: [
                        new sap.ui.model.Filter({
                            path: 'DefectInternalID',
                            operator: sap.ui.model.FilterOperator.EQ,
                            value1: vDefectInternalID
                        })
                    ],
                    success: jQuery.proxy(function (oRetrievedResult) {
                        this.setDefectCodeProposalIndicator(
                            oRetrievedResult && oRetrievedResult.results && oRetrievedResult.results.length > 0
                        );
                    }, this),
                    error: function (oError) {
                        /*debugger;*/
                    }
                });
            },

            setDefectCodeProposalIndicator: function (vShowIndicator) {
                var oDefectCode = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_2::DefectCode::Field'
                );

                if (vShowIndicator) {
                    oDefectCode.setValueState(sap.ui.core.ValueState.Information);
                    oDefectCode.setValueStateText(
                        this.getOwnerComponent().getModel('i18n').getResourceBundle().getText('MSG_CODE_PROPOSAL_EXIST')
                    );
                    oDefectCode.setShowValueStateMessage(false); //for whatever reason the value state message is shown nevertheless... therefore we set it with an appropriate text
                } else {
                    oDefectCode.setValueState(sap.ui.core.ValueState.None);
                    oDefectCode.setShowValueStateMessage(true);
                }
            },

            initDefectCode: function () {
                var fn = function (oEventInnerControlsCreated) {
                    if (oEventInnerControlsCreated.getSource().getInnerControls()[0] instanceof sap.m.Input) {
                        var oDefectCode = oEventInnerControlsCreated.getSource().getInnerControls()[0];
                        oDefectCode.setStartSuggestion(0);
                    }
                };

                var oDefectCode = this.getView().byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectDataFacet1_2::DefectCode::Field'
                );
                if (oDefectCode) {
                    oDefectCode.attachInnerControlsCreated(fn, this);
                }
            },

            /************************************************************************************************************************************/
            /* QualityTaskProcsrNotes Popover     */
            onQualityTaskProcsrNotesPreviewPress: function (oEvent) {
                //initialize the popover
                if (!this._oPopover) {
                    this._oPopover = sap.ui.xmlfragment(
                        'QualityTaskProcsrNotes',
                        'i2d.qm.defect.records1.ext.fragment.QualityTaskProcsrNotesPopover',
                        this
                    );
                    this.getView().addDependent(this._oPopover);
                    this._oPopover.setPlacement(sap.m.PlacementType.VerticalPreferedBottom);
                }
                this._oPopover.openBy(oEvent.getSource());

                //get the full QualityTaskProcessorNotes from the model via the context of the clicked QualityTaskProcessorNotesPreview ...
                var oModel = oEvent.getSource().getModel();
                var oContext = oEvent.getSource().getBindingContext();
                var vQualityTaskProcessorNotes = oModel.getProperty(
                    'to_DefectQltyTskProcsrNotes/QualityTaskProcessorNotes',
                    oContext
                );
                //... and set it in the popover
                sap.ui
                    .getCore()
                    .byId(sap.ui.core.Fragment.createId('QualityTaskProcsrNotes', 'QualityTaskProcessorNotes'))
                    .setText(vQualityTaskProcessorNotes);
            },

            /************************************************************************************************************************************/
            /* Affected Object Smarttable */
            initAffcdObjTab: function () {
                if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_AFFECTED_OBJ') !== true) {
                    // Feature 'Affected Objects' not available => leave function
                    return;
                }
                var vAffcdObjSmartTabId =
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--AffectedObjectsSmartTable';
                var vAffcdObjResponsiveTabId =
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--AffectedObjectsSmartTable-ui5table';
                var oAffcdObjSmartTab = this.getView().byId(vAffcdObjSmartTabId);
                var oAffcdObjResponsiveTab = this.getView().byId(vAffcdObjResponsiveTabId);

                //      Editability depends on ui being editable and defect lifeycle status
                /*
        if (oAffcdObjSmartTab) {
	        oAffcdObjSmartTab.bindProperty("editable", {
					parts: [
			        	{	path: "ui>/editable" },
		    	    	{	path: "DefectLifecycleStatus" }
			    	],
		        
			        formatter: function (editable, DefectLifecycleStatus) {
			        	if (editable && DefectLifecycleStatus !== "20" && DefectLifecycleStatus !== "10" ) {
		    	    		return true;
			        	} else {
			        		return false;
			        	}
			       }
	        });
        }
*/

                //      List mode depends on ui being editable and defect lifeycle status
                if (oAffcdObjResponsiveTab) {
                    oAffcdObjResponsiveTab.bindProperty('mode', {
                        parts: [{ path: 'ui>/editable' }, { path: 'DefectLifecycleStatus' }],

                        formatter: function (editable, DefectLifecycleStatus) {
                            if (editable && DefectLifecycleStatus !== '20' && DefectLifecycleStatus !== '10') {
                                return sap.m.ListMode.MultiSelect;
                            } else {
                                return sap.m.ListMode.None;
                            }
                        }
                    });
                }
                this.extensionAPI.attachPageDataLoaded(jQuery.proxy(this.refreshAffectedObjectActions, this));
                var oModelAffectedObjectTableState = new sap.ui.model.json.JSONModel({
                    affectedObjectsTableHasSelectedItems: false
                });
                this.getView().setModel(oModelAffectedObjectTableState, 'affectedObjectTableState');
                if (oAffcdObjSmartTab) {
                    oAffcdObjSmartTab.getTable().attachSelectionChange(
                        function (oEventSelectionChange) {
                            var affectedObjectsTableHasSelectedItems =
                                oEventSelectionChange.getSource().getSelectedItems().length > 0;
                            this.getView()
                                .getModel('affectedObjectTableState')
                                .setProperty(
                                    '/affectedObjectsTableHasSelectedItems',
                                    affectedObjectsTableHasSelectedItems
                                );
                        }.bind(this)
                    );
                }

                this.initAffectedObjectActionMenuBtn();
            },

            onBeforeRebindAffectedObjectsSmartTable: function (oEvent) {
                if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_AFFECTED_OBJ') !== true) {
                    // Feature 'Affected Objects' not available => leave function
                    return;
                }
                var mBindingParams = oEvent.getParameter('bindingParams');
                var aSorter = mBindingParams.sorter;
                var oAffectedObjectSorter = new sap.ui.model.Sorter('DefectAffectedObject');
                aSorter.push(oAffectedObjectSorter);
            },

            initAffectedObjectActionMenuBtn: function () {
                if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_AFFECTED_OBJ') !== true) {
                    // Feature 'Affected Objects' not available => leave function
                    return;
                }
                var oAffectedObjectActionsMenuBtn = this.getView().byId('AffectedObjectActionsMenu');
                if (oAffectedObjectActionsMenuBtn) {
                    var oItemTemplate = new sap.m.MenuItem({
                        text: "{path: 'QLTYTASKFOLLOWUPACTIONTEXT', model: 'affectedObjectTableState'}",
                        enabled: {
                            parts: [
                                { path: '/affectedObjectsTableHasSelectedItems', model: 'affectedObjectTableState' },
                                { path: 'LINESELECTIONISREQUIRED', model: 'affectedObjectTableState' }
                            ],
                            formatter: this.getAffectedObjectActionEnabled.bind(this)
                        },

                        press: this.invokeAffectedObjectAction.bind(this),
                        customData: [
                            new sap.ui.core.CustomData({
                                key: 'QUALITYTASKCODEGROUP',
                                value: "{path: 'QUALITYTASKCODEGROUP', model: 'affectedObjectTableState'}"
                            }),
                            new sap.ui.core.CustomData({
                                key: 'QUALITYTASKCODE',
                                value: "{path: 'QUALITYTASKCODE', model: 'affectedObjectTableState'}"
                            }),
                            new sap.ui.core.CustomData({
                                key: 'QLTYTASKFOLLOWUPACTIONTEXT',
                                value: "{path: 'QUALITYTASKCODE', model: 'affectedObjectTableState'}"
                            }),
                            new sap.ui.core.CustomData({
                                key: 'LINESELECTIONISREQUIRED',
                                value: "{path: 'LINESELECTIONISREQUIRED', model: 'affectedObjectTableState'}"
                            })
                        ]
                    });
                    oAffectedObjectActionsMenuBtn.getMenu().bindAggregation('items', {
                        path: 'affectedObjectTableState>/affectedObjectsTableActions',
                        model: 'affectedObjectTableState',
                        template: oItemTemplate
                    });
                    oAffectedObjectActionsMenuBtn.bindProperty('visible', {
                        parts: [
                            {
                                path: 'affectedObjectTableState>/affectedObjectsTableActions',
                                model: 'affectedObjectTableState'
                            },
                            { path: '/Create_quality_task_ac', model: 'affectedObjectTableState' }
                        ],
                        formatter: function (affectedObjectsTableActions, Create_quality_task_ac) {
                            return (
                                (affectedObjectsTableActions &&
                                    affectedObjectsTableActions.length > 0 &&
                                    Create_quality_task_ac) === true
                            );
                        }
                    });
                    oAffectedObjectActionsMenuBtn
                        .getMenu()
                        .setModel(this.getView().getModel('affectedObjectTableState'), 'affectedObjectTableState');
                }
            },

            refreshAffectedObjectActions: function () {
                if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_AFFECTED_OBJ') !== true) {
                    // Feature 'Affected Objects' not available => leave function
                    return;
                }
                var oBindingContext = this.getView().getBindingContext();
                if (!oBindingContext) {
                    // For some reason this function is also called from ListReport, then 'oBindingContext' is null => leave function:
                    return;
                }
                var oDefectConfiguration = JSON.parse(oBindingContext.getProperty('DefectConfigurationValue') || '{}');
                var vCreateQualityTaskAc = oBindingContext.getProperty('Create_quality_task_ac');
                var oModelAffectedObjectTableState = this.getView().getModel('affectedObjectTableState');
                oModelAffectedObjectTableState.setProperty(
                    '/affectedObjectsTableActions',
                    oDefectConfiguration.AFFECTEDOBJECTSACTIONS
                );
                oModelAffectedObjectTableState.setProperty(
                    '/defectHasAffectedObjects',
                    oDefectConfiguration.DEFECTHASAFFECTEDOBJECTS
                );
                oModelAffectedObjectTableState.setProperty('/Create_quality_task_ac', vCreateQualityTaskAc);

                if (!oModelAffectedObjectTableState.getProperty('/request_completed_handler_attached')) {
                    this.getView()
                        .getModel()
                        .attachRequestCompleted(
                            function (oEventRequestCompleted) {
                                if (oEventRequestCompleted.getParameter('url').startsWith('C_DefectRecord')) {
                                    // this shall match all request for the defect data to update the affected object actions accordingly
                                    this.refreshAffectedObjectActions();
                                }
                            }.bind(this)
                        );
                    oModelAffectedObjectTableState.setProperty('/request_completed_handler_attached', true);
                }
            },

            getAffectedObjectActionEnabled: function (affectedObjectsTableHasSelectedItems, lineSelectionIsRequired) {
                return lineSelectionIsRequired ? affectedObjectsTableHasSelectedItems : true;
            },

            invokeAffectedObjectAction: function (oEventPress) {
                var oAffectedActionData = oEventPress.getSource().data();
                var vCreateQualityTaskFunctionName =
                    'QM_DEFECT_RECORD_SRV.QM_DEFECT_RECORD_SRV_Entities/C_DefectRecordCreate_quality_task';
                var oBindingContext = this.getView().getBindingContext();
                var aSelectedDefectAffectedObject = [];

                if (oAffectedActionData.LINESELECTIONISREQUIRED) {
                    //check if affected objects are selected
                    var aAffectedObjectsSelectedContexts = this.getView()
                        .byId('AffectedObjectsSmartTable')
                        .getTable()
                        .getSelectedContexts();
                    if (aAffectedObjectsSelectedContexts.length === 0) {
                        // error -> affected objects must be selected
                        this.showErrorBox(
                            'AFFECTED_OBJECTS_ACT_REQU_SELECTION',
                            oAffectedActionData.QLTYTASKFOLLOWUPACTIONTEXT
                        );
                        return;
                    }
                    aSelectedDefectAffectedObject = aAffectedObjectsSelectedContexts.map(
                        function (affectedObjectsSelectedContext) {
                            return affectedObjectsSelectedContext.getProperty('DefectAffectedObject');
                        }
                    );
                }
                var oActionParameters = {
                    'Qtaskcodegroup': oAffectedActionData.QUALITYTASKCODEGROUP,
                    'Qtaskcode': oAffectedActionData.QUALITYTASKCODE,
                    'AffectedObjects': aSelectedDefectAffectedObject
                };

                this.extensionAPI
                    .securedExecution(
                        function () {
                            return this.extensionAPI.invokeActions(
                                vCreateQualityTaskFunctionName,
                                oBindingContext,
                                oActionParameters
                            );
                        }.bind(this)
                    ) // returns a promise
                    .then(function (oResponse) {}.bind(this))

                    .catch(function (oResponse) {
                        // there is also nothing to do if the promise fails: error messages are displayed automatically
                    });
                // register execution of side-effect; the side-effect is defined via annotations
                this.extensionAPI.getTransactionController().executeSideEffects({
                    sourceEntities: [vCreateQualityTaskFunctionName]
                });
            },

            /**
             *  Formatter function which combines action control property and editable property
             */
            getActionEnabled: function (Action_ac, editable) {
                return Action_ac && editable;
            },

            // Formatter for Affected Objects Action Remove
            getActionRemoveVisible: function (editable, actionEnabled) {
                return editable && actionEnabled;
            },

            getActionRemoveEnabled: function (editable, hasLineSelection) {
                return editable && hasLineSelection;
            },

            initChangeDocumentVisibility: function () {
                if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_CHANGE_DOC') === true) {
                    var oChangedocReuseComponent = this.getView().byId(
                        'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--ChangedocReuseComponent::changedoccomponent::ComponentSubSection'
                    );
                    if (oChangedocReuseComponent) {
                        oChangedocReuseComponent.setProperty('visible', true);
                    }
                }
            },
            initOutputManagementVisibility: function () {
                if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_OUTPUT_MNG') === true) {
                    var oOutputManagementSection = this.getView().byId(
                        'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--DefectOutputManagement::Section'
                    );
                    if (oOutputManagementSection) {
                        oOutputManagementSection.setProperty('visible', true);
                    }
                }
            },

            onClickActionRemoveAffectedObject: function (oEvent) {
                var vRemAffObjFunctionName = '/A29975663DC1E15EC41F30DEDelete_affcd_obj';
                var aAffectedObjectsSelectedItems = this.getView()
                    .byId('AffectedObjectsSmartTable')
                    .getTable()
                    .getSelectedItems();
                var oModel = this.getView().getModel();
                var aPromises = [];
                var aDeferredGroups = oModel.getDeferredGroups();
                aDeferredGroups.push('RemoveAffcdObj');
                oModel.setDeferredGroups(aDeferredGroups);

                var createRemoveAndSubmitPromise = function () {
                    aAffectedObjectsSelectedItems.forEach(function (oItem) {
                        var oItemData = oItem.getBindingContext().getObject();
                        // Add 1 promise for each selected line calling the remove function import
                        aPromises.push(
                            oModel
                                .callFunction(vRemAffObjFunctionName, {
                                    method: 'POST',
                                    urlParameters: {
                                        DefectAffectedObject: oItemData.DefectAffectedObject,
                                        DefectInternalID: oItemData.DefectInternalID,
                                        DraftUUID: oItemData.DraftUUID,
                                        IsActiveEntity: oItemData.IsActiveEntity
                                    },
                                    groupId: 'RemoveAffcdObj',
                                    changeSetId: 'RemoveAffcdObj'
                                })
                                .contextCreated()
                        );
                    });

                    // Add additional promise for submitChanges
                    var submitChgPromise = new Promise(function (resolve, reject) {
                        oModel.submitChanges({
                            groupId: 'RemoveAffcdObj',
                            success: function (oResponse) {
                                resolve();
                            },
                            error: function (oResponse) {
                                reject();
                            }
                        });
                    });
                    aPromises.push(submitChgPromise);

                    return Promise.all(aPromises);
                };

                this.extensionAPI.securedExecution(createRemoveAndSubmitPromise.bind(this));
                this.extensionAPI.getTransactionController().executeSideEffects({
                    sourceEntities: [vRemAffObjFunctionName]
                });
            }
            /************************************************************************************************************************************/
        });
        return ObjectPageExt;
    }
);
