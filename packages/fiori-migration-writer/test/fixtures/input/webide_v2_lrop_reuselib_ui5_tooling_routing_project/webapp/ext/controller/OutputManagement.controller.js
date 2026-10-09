sap.ui.controller('i2d.qm.defect.records1.ext.controller.OutputManagement', {
    onInit: function () {
        // sKey and sObjectType have to be set according to the business object
        var sObjectType = 'QM_DEFECT';
        var sMode = 'D'; //"{= ${ui>/editable}?'C':'D'}";
        var sKey = 'DefectInternalID';
        var sCurrentKey = '';
        var bHideAddAction = true;
        var bHideSendOutputAction = true;
        var bHideRetryAction = false;

        if (sap.example.lib.featuretoggle.lib.features().getFeatureStatus('QM_CE_DEFECT_OUTPUT_MNG') !== true) {
            // Leave without further processing if feature toggle is off
            return;
        }

        this.getOwnerComponent()
            .getModel()
            .attachBatchRequestCompleted(
                function (oEvent) {
                    try {
                        sCurrentKey = this.getOwnerComponent().getBindingContext().getProperty(sKey).substring(1);
                    } catch (err) {
                        // Exception in mock mode
                        return;
                    }

                    if (sCurrentKey) {
                        if (!this._oOutputComponent) {
                            this._oOutputComponent = sap.ui.getCore().createComponent({
                                name: 'sap.ssuite.fnd.om.outputcontrol.outputitems',
                                id: this.createId('OutputComponent'),
                                settings: {
                                    editMode: sMode,
                                    objectId: sCurrentKey,
                                    objectType: sObjectType,
                                    showTableTitle: false,
                                    hideAddAction: bHideAddAction,
                                    hideIssueOutputAction: bHideSendOutputAction,
                                    disableActionsInDisplayMode: true,
                                    hideRetryAction: bHideRetryAction,
                                    hideDuplicateAction: true,
                                    hideSetToCompletedAction: true
                                }
                            });
                            this.byId('OutputManagementComponentContainer').setComponent(this._oOutputComponent);
                        } else if (
                            sCurrentKey !== this._oOutputComponent.getObjectId() ||
                            this.isPrintRequest(oEvent)
                        ) {
                            this._oOutputComponent.setObjectId(sCurrentKey);
                            this._oOutputComponent.refresh();
                        }
                    }
                }.bind(this)
            );
    },

    isPrintRequest: function (oEvent) {
        var printAction = 'C_DefectRecordPrint';
        var aRequest = oEvent.getParameter('requests');

        for (var i = 0; i < aRequest.length; i++) {
            if (aRequest[i].url && aRequest[i].url.startsWith(printAction)) {
                return true;
            }
        }
        return false;
    }
});
