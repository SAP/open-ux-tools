sap.ui.define([], function () {
    'use strict';
    // class providing static utility methods for controlling the visibility of UI elements depending on the value of the defect category.
    return {
        /**
         * Collects all UI elements which depends on some defect category.
         * UI elements are sections and fieldgroups. Subsections are not handled.
         * @Param: Object - UI5 View
         * @Global: Object - UI5 View
         * @Global: Array - UI element ID, defect category
         */
        collectDependentUIElements: function (oView) {
            //create JSON model for later usage of data binding
            var oModelDependentUIElements = new sap.ui.model.json.JSONModel();
            oView.setModel(oModelDependentUIElements, 'dependentUIElements');

            // Store View; necessary for call of method setUIElementsVisibility
            this.oView = oView;
            this.aDependentUIElements = [];
            var aSections = oView
                .byId(
                    'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--objectPage'
                )
                .getSections();
            for (var i = 0; i < aSections.length; i++) {
                var sSectionId = aSections[i].getId();
                this._addDependentUIElementId(sSectionId);
                this._collectFormGroups(sSectionId);
            }

            //set the collected UI element data as data in the JSON model
            oModelDependentUIElements.setData(this.aDependentUIElements);
            //bind the visible property each each dependent UI element to a formatter
            for (i = 0; i < this.aDependentUIElements.length; i++) {
                this.oView.byId(this.aDependentUIElements[i].UIElementId).bindProperty('visible', {
                    parts: [
                        { path: 'DefectCategory' }, //the defect category of the currently dislayed defect
                        { path: 'dependentUIElements>/' + i + '/DefectCategory' } //the target defect category of the UI elements as derived from its ID
                    ],
                    formatter: function (DefectCategory, TargetDefectCategory) {
                        //set visible to true if the current defect category equals the defect category set for this UI element
                        return DefectCategory === TargetDefectCategory;
                    }
                });
            }
        },

        /**
         * Collects fieldgroups of some section which depends on some defect category.
         * @Param: String - Id of a section
         * @Global: Object - UI5 View
         * @Global: Array - UI element ID, defect category
         */
        _collectFormGroups: function (sSectionId) {
            var sFormId = sSectionId.replace('::Section', '::Form');
            var oForm = this.oView.byId(sFormId);
            if (oForm && oForm.getGroups) {
                var aGroups = oForm.getGroups();
                for (var i = 0; i < aGroups.length; i++) {
                    this._addDependentUIElementId(aGroups[i].getId());
                }
            }
        },

        /**
         * Check if ID of UI element is macthing the pattern. Skip ID if pattern does not match.
         * Pattern: The "core" ID starts with "zext_" (not case sensitive) and contains some valid value for defect category at string position 6 and 7.
         *          "Core ID" means the part which is defined in the annotation file without the app specific prefix.
         *          There's no validity check for the value of the defect category.
         * @Param: String - ID of some UI element
         */
        _addDependentUIElementId: function (sUIElementId) {
            // Check and get position of the "Core ID"
            var iStartIndex = sUIElementId.toLowerCase().indexOf('zext_');
            if (iStartIndex === -1) {
                return;
            }
            // "Core ID" is ended with a "::". This "::" is the last occurany of several "::"
            var iEndIndex = sUIElementId.lastIndexOf('::');
            // Plausibility check (EndIndex must be greater than StartIndex)
            if (!(iStartIndex < iEndIndex)) {
                return;
            }
            var sUIElementMetadataId = sUIElementId.substring(iStartIndex, iEndIndex);
            this.aDependentUIElements.push({
                UIElementId: sUIElementId,
                DefectCategory: sUIElementMetadataId.substr(5, 2).toUpperCase()
            });
        }
    };
});
