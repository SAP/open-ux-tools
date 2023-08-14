// @ts-nocheck

export default (rta: sap.ui.rta.RuntimeAuthoring) => {
    const fragmentDialog = new FragmentDialog(rta);
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    contextMenu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: 'Add: Fragment',
        handler: async (overlays: any) => await fragmentDialog.handleAddNewFragment(overlays),
        // handler: () => {},
        icon: 'sap-icon://attachment-html'
    });
};

enum RequestMethod {
    GET = 'GET',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE'
}

interface GETFragmentsResponse {
    fragments: string[];
    message: string;
}

class FragmentDialog {
    constructor(private rta: sap.ui.rta.RuntimeAuthoring) {}

    private getRuntimeControl(overlayControl: sap.ui.dt.ElementOverlay): sap.ui.base.ManagedObject {
        let runtimeControl;
        if (overlayControl.getElementInstance) {
            runtimeControl = overlayControl.getElementInstance();
        } else {
            runtimeControl = overlayControl.getElement();
        }
        return runtimeControl;
    }

    private getControlAggregationByName(oControl: any, sName: string) {
        var aResult = [],
            oAggregation = ((oControl && oControl.getMetadata().getAllAggregations()) || {})[sName];

        if (oAggregation) {
            if (!oAggregation._sGetter && !oControl.__calledJSONKeys) {
                oControl.getMetadata().getJSONKeys();
                // Performance optimization
                oControl.__calledJSONKeys = true;
            }

            aResult = (oAggregation._sGetter && oControl[oAggregation._sGetter]()) || [];

            //the aggregation has primitive alternative type
            if (typeof aResult !== 'object') {
                aResult = [];
            }
            aResult = aResult.splice ? aResult : [aResult];
        }
        return aResult;
    }

    private analyzePropertyType(property: sap.ui.base.ManagedObjectMetadataProperties): any | undefined {
        const analyzedType = {
            primitiveType: 'any',
            ui5Type: null,
            enumValues: null,
            isArray: false
        };

        if (!property) {
            return;
        }

        const propertyType = property.getType();
        if (!propertyType) {
            return;
        }

        const typeName = propertyType.getName();
        if (!typeName) {
            return;
        }

        // Check if array and determine property type (or component type)
        if (typeName.indexOf('[]') > 0) {
            analyzedType.primitiveType = typeName.substring(0, typeName.indexOf('[]'));
            analyzedType.isArray = true;
        }
        // Return if object or void type
        else if (typeName === 'void' || typeName === 'object') {
            analyzedType.primitiveType = typeName;
        } else if (typeName === 'any') {
            analyzedType.primitiveType = 'any';
        }
        // Type of control property is an elementary simple type
        else if (typeName === 'boolean' || typeName === 'string' || typeName === 'int' || typeName === 'float') {
            analyzedType.primitiveType = typeName;
        }
        // Control type is a sap.ui.base.DataType or an enumeration type
        else {
            // Determine type from iFrame
            // @ts-ignore
            const DataType = window.sap.ui.base.DataType;
            const propertyDataType = DataType.getType(typeName);

            //type which is not a DataType such as Control is not supported
            if (propertyDataType && !(propertyDataType instanceof DataType)) {
                return analyzedType;
            }
            const name = Object.getPrototypeOf(propertyDataType).getName();
            if (!name) {
                analyzedType.primitiveType = 'enum';
            } else {
                analyzedType.primitiveType = name;
            }
            analyzedType.ui5Type = typeName;

            // Determine base type for SAP types
            if (analyzedType.primitiveType === 'enum') {
                // @ts-ignore
                analyzedType.enumValues = jQuery.sap.getObject(analyzedType.ui5Type);
            }
        }

        return analyzedType;
    }

    private isPropertyEnabled(analyzedType: any): boolean {
        return analyzedType.isArray || analyzedType.primitiveType === 'any' ? false : true;
    }

    private normalizeObjectPropertyValue(rawValue: any): string {
        if (typeof rawValue === 'object' && rawValue instanceof Object && !Array.isArray(rawValue)) {
            try {
                return JSON.stringify(rawValue);
            } catch (e) {
                if (e instanceof Error && e.message.toLowerCase().includes('converting circular structure to json')) {
                    // some objects can be circular, e.g.:
                    // var obj = {
                    //    key1: value,
                    //    key2: obj
                    // }
                    // and JSON.stringify can't handle that so we reach here.
                    // however, postMessage can't handle that either, and throws:
                    // "Failed to execute 'postMessage' on 'Window': An object could not be cloned".
                    // so we need to check whether this is the failure and if so, don't return the rawValue,
                    // but some default string to act as the property value.
                    // (BCP: 1780025011)
                    return '<Circular JSON cannot be displayed>';
                }

                return rawValue;
            }
        } else if (typeof rawValue === 'function') {
            return '';
        } else {
            return rawValue;
        }
    }

    private testIconPattern(name: string): boolean {
        // replace `/src|.*icon$|^icon.*/i`.test(property.name);
        // match 'src' or any string starting or ending with 'icon' (case insensitive;)
        const nameLc = (name || '').toLowerCase();
        return nameLc.indexOf('src') >= 0 || nameLc.startsWith('icon') || nameLc.endsWith('icon');
    }

    private convertCamelCaseToPascalCase = (text: string): string => {
        const string = text.replace(/([A-Z])/g, ' $1');
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    private async buildControlData(
        // @ts-ignore
        control: sap.ui.base.ManagedObject,
        controlOverlay?: sap.ui.dt.ElementOverlay,
        includeDocumentation = true
    ): Promise<any> {
        const controlMetadata = control.getMetadata();

        const selectedControlName = controlMetadata.getName();
        const selContLibName = controlMetadata.getLibraryName();

        const hasStableId = sap.ui.fl.Utils.checkControlId(control);

        const controlProperties = controlOverlay
            ? controlOverlay.getDesignTimeMetadata().getData().properties
            : undefined;

        // Add the control's properties
        const allProperties = controlMetadata.getAllProperties() as unknown as {
            [name: string]: sap.ui.base.ManagedObjectMetadataProperties;
        };
        const propertyNames = Object.keys(allProperties);
        const properties = [];
        // const document = includeDocumentation ? await getDocumentation(selectedControlName, selContLibName) : {};
        const document = {};
        for (const propertyName of propertyNames) {
            const property = allProperties[propertyName];

            const analyzedType = this.analyzePropertyType(property);
            if (!analyzedType) {
                continue;
            }
            // the default behavior is that the property is enabled
            // meaning it's not ignored during design time
            let ignore = false;
            if (controlProperties && controlProperties[property.name]) {
                // check whether the property should be ignored in design time or not
                // if it's 'undefined' then it's not considered when building isEnabled because it's 'true'
                ignore = controlProperties[property.name].ignore;
            }

            //updating i18n text for the control if bindingInfo has bindingString
            const controlNewData = {
                id: control.getId(),
                name: property.name,
                newValue: control.getProperty(property.name)
            };
            const bindingInfo: { bindingString?: string } = control.getBindingInfo(controlNewData.name);
            if (bindingInfo?.bindingString !== undefined) {
                controlNewData.newValue = bindingInfo.bindingString;
            }

            // A property is enabled if:
            // 1. The property supports changes
            // 2. The control has stable ID
            // 3. It is not configured to be ignored in design time
            // 4. And control overlay is selectable
            const isEnabled =
                (controlOverlay?.isSelectable() ?? false) &&
                this.isPropertyEnabled(analyzedType) &&
                hasStableId &&
                !ignore;
            const value = this.normalizeObjectPropertyValue(controlNewData.newValue);
            const isIcon =
                this.testIconPattern(property.name) &&
                selectedControlName !== 'sap.m.Image' &&
                analyzedType.ui5Type === 'sap.ui.core.URI';
            const documentation =
                document && document[property.name]
                    ? document[property.name]
                    : {
                          defaultValue: (property.defaultValue as string) || '-',
                          description: '',
                          propertyName: property.name,
                          type: analyzedType.ui5Type,
                          propertyType: analyzedType.ui5Type
                      };
            const readableName = this.convertCamelCaseToPascalCase(property.name);
            switch (analyzedType.primitiveType) {
                case 'enum': {
                    const values = analyzedType.enumValues ?? {};
                    const options: { key: string; text: string }[] = Object.keys(values).map((key) => ({
                        key,
                        text: values[key]
                    }));
                    // @ts-ignore
                    properties.push({
                        type: 'string',
                        editor: 'dropdown',
                        name: property.name,
                        readableName,
                        value,
                        isEnabled,
                        options,
                        documentation
                    });
                    break;
                }
                case 'string': {
                    // @ts-ignore
                    properties.push({
                        type: 'string',
                        editor: 'input',
                        name: property.name,
                        readableName,
                        value,
                        isEnabled,
                        isIcon,
                        documentation: documentation
                    });
                    break;
                }
                case 'int': {
                    // @ts-ignore
                    properties.push({
                        type: 'integer',
                        editor: 'input',
                        name: property.name,
                        readableName,
                        value: value as unknown as number,
                        isEnabled,
                        documentation
                    });
                    break;
                }
                case 'float': {
                    // @ts-ignore
                    properties.push({
                        type: 'float',
                        editor: 'input',
                        name: property.name,
                        readableName,
                        value: value as unknown as number,
                        isEnabled,
                        documentation
                    });
                    break;
                }
                case 'boolean': {
                    // @ts-ignore
                    properties.push({
                        type: 'boolean',
                        editor: 'checkbox',
                        name: property.name,
                        readableName,
                        value: value as unknown as boolean,
                        isEnabled,
                        documentation
                    });
                    break;
                }
            }
        }

        return {
            id: control.getId(), //the id of the underlying control/aggregation
            type: selectedControlName, //the name of the ui5 class of the control/aggregation
            // @ts-ignore
            properties: properties.sort((a, b) => (a.name > b.name ? 1 : -1)),
            name: selectedControlName
        };
    }

    public async handleAddNewFragment(overlays: any) {
        const that: FragmentDialog = this;
        const {
            Dialog,
            Label,
            Text,
            ListMode,
            List,
            Input,
            ComboBox,
            PlacementType,
            Popover,
            ToolbarSpacer,
            SearchField,
            Button,
            ButtonType,
            Link,
            Bar,
            MessageToast
        } = sap.m;

        const { ValueState, Item, CustomData } = sap.ui.core;

        let bAddFragment: boolean;

        let runtimeControl: sap.ui.base.ManagedObject = null;
        let controlName = null;
        let control = null;
        const selectorId = overlays[0].getId();

        const oModel = new sap.ui.model.json.JSONModel();

        let controlMetadata: sap.ui.core.ElementMetadata = null;
        const overlayControl: sap.ui.dt.ElementOverlay = sap.ui.getCore().byId(selectorId);
        if (overlayControl) {
            runtimeControl = this.getRuntimeControl(overlayControl);
            // @ts-ignore
            controlMetadata = runtimeControl.getMetadata();
            controlName = controlMetadata.getName();
            control = await this.buildControlData(runtimeControl, overlayControl);
        }

        const aAllAggregation = Object.keys(controlMetadata.getAllAggregations());
        const aHiddenAggregation = ['customData', 'layoutData', 'dependents'];
        const targetAggregation = aAllAggregation.filter(function (item) {
            if (aHiddenAggregation.indexOf(item) === -1) return item;
        });
        // @ts-ignore
        const defaultAggregation = runtimeControl.getMetadata().getDefaultAggregationName();
        // @ts-ignore
        const selectedControlName = control.name;

        let selectedControlChildren = Object.keys(this.getControlAggregationByName(runtimeControl, defaultAggregation));

        let allowIndexForDefaultAggregation = true;
        const oDefaultAggregationDesignTimeMetadata = overlayControl.getDesignTimeMetadata().getData().aggregations[
            defaultAggregation
        ];

        if (oDefaultAggregationDesignTimeMetadata !== undefined) {
            allowIndexForDefaultAggregation =
                oDefaultAggregationDesignTimeMetadata.specialIndexHandling === true ? false : true;
        }

        // @ts-ignore
        selectedControlChildren = selectedControlChildren.map(function (key) {
            return parseInt(key);
        });

        let _aIndexArray = [];
        const selectedControlChildrenLength = selectedControlChildren.length;

        oModel.setProperty('/selectedControlName', selectedControlName);
        oModel.setProperty('/selectedAggregation', {});
        oModel.setProperty('/indexHandlingFlag', allowIndexForDefaultAggregation);

        if (selectedControlChildren.length === 0) {
            // @ts-ignore
            _aIndexArray.push({ key: 0, value: 0 });
        } else {
            // @ts-ignore
            _aIndexArray = selectedControlChildren.map(function (elem, index) {
                return { key: index + 1, value: elem + 1 };
            });
            // @ts-ignore
            _aIndexArray.unshift({ key: 0, value: 0 });
            // @ts-ignore
            _aIndexArray.push({
                key: selectedControlChildrenLength + 1,
                value: selectedControlChildrenLength + 1
            });
        }

        const _aControlAggregation = targetAggregation.map(function (elem, index) {
            return { key: index, value: elem };
        });

        if (defaultAggregation !== null) {
            _aControlAggregation.forEach(function (obj) {
                if (obj.value === defaultAggregation) {
                    // @ts-ignore
                    obj.key = 'default';
                    oModel.setProperty('/selectedAggregation/key', obj.key);
                    oModel.setProperty('/selectedAggregation/value', obj.value);
                }
            });
        } else {
            oModel.setProperty('/selectedAggregation/key', _aControlAggregation[0].key);
            oModel.setProperty('/selectedAggregation/value', _aControlAggregation[0].value);
        }

        let existingFragmentsInWorkspace: string[];
        try {
            const response = await fetch('./preview/api/fragment');
            const data: GETFragmentsResponse = await response.json();
            existingFragmentsInWorkspace = data.fragments;
            oModel.setProperty('/filteredFragmentList', {
                fragmentList: existingFragmentsInWorkspace,
                newFragmentName: '',
                selectorId: selectorId,
                unFilteredFragmentList: existingFragmentsInWorkspace
            });
            oModel.setProperty('/fragmentCount', data.fragments.length);
        } catch (e) {
            console.error(e.message);
        }

        oModel.setProperty('/selectedIndex', _aIndexArray.length - 1);
        oModel.setProperty('/defaultAggregation', defaultAggregation);
        oModel.setProperty('/targetAggregation', _aControlAggregation);
        oModel.setProperty('/index', _aIndexArray);
        oModel.setProperty('/selectorId', selectorId ? selectorId : 'oCurrentSelection.id');

        const oFragmentList = new List('filteredFragmentList', {
            noDataText: 'Create a fragment. There is no fragment available for the target aggregation.',
            mode: ListMode.SingleSelectMaster,
            selectionChange: function (oEvent) {
                const oSelectedItem = oEvent.getSource().getSelectedItem();
                oModel.setProperty('/SelectedFragment', {
                    selectedFragmentName: oSelectedItem.getTitle(),
                    selectedFragmentPath: oSelectedItem.getCustomData()[0].getKey()
                });
                // const bEnabled = !!(oSelectedItem && that._getExtPointTargetAggregationComboItem());
                const bEnabled = !!oSelectedItem;
                bAddFragment = true;
                fragmentDialog.getBeginButton().setEnabled(bEnabled);
            }
        }).addStyleClass('uiadaptationFragmentList');

        oFragmentList.bindItems(
            '/filteredFragmentList/fragmentList',
            // @ts-ignore
            new sap.m.StandardListItem({
                customData: new CustomData({
                    key: '{fragmentDocumentPath}'
                }),
                title: '{fragmentName}'
            })
        );

        const oFragmentNameInput = new Input({
            width: '24rem',
            description: '.fragment.xml',
            value: '{/newFragmentName}',
            liveChange: async function (oEvent) {
                const fragmentName = oEvent.getSource().getValue();
                const fragmentList = oModel.getProperty('/filteredFragmentList/unFilteredFragmentList');

                const iExistingFileIndex = fragmentList.findIndex((f) => {
                    return f.fragmentName === `${fragmentName}.fragment.xml`;
                });
                switch (true) {
                    case iExistingFileIndex >= 0:
                        oEvent.getSource().setValueState(ValueState.Error);
                        oEvent
                            .getSource()
                            .setValueStateText(
                                'Enter a different name. The fragment name that you entered already exists in your project.'
                            );
                        fragmentDialog.getBeginButton().setEnabled(false);
                        oModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length <= 0:
                        fragmentDialog.getBeginButton().setEnabled(false);
                        oModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case !/^[a-zA-Z_]+[a-zA-Z0-9_-]*$/.test(fragmentName):
                        oEvent.getSource().setValueState(ValueState.Error);
                        oEvent
                            .getSource()
                            .setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                        fragmentDialog.getBeginButton().setEnabled(false);
                        oModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length > 0:
                        fragmentDialog.getBeginButton().setEnabled(true);
                        oEvent.getSource().setValueState(ValueState.None);
                        oModel.setProperty('/fragmentNameToCreate', fragmentName);
                        break;
                }
            }
        });
        const oControlAggregationComboBox = new ComboBox('extPointTargetAggregationCombo', {
            selectedKey: '{/selectedAggregation/key}',
            change: function (oEvent) {
                let selectedItem = null;
                // @ts-ignore
                sap.ui.getCore().byId('filteredFragmentSearchField').setValue('');
                if (oEvent.oSource.getSelectedItem()) {
                    selectedItem = oEvent.oSource.getSelectedItem().getText();
                }
                const selectedKey = oEvent.oSource.getSelectedKey();
                if (!selectedItem) {
                    // @ts-ignore
                    // sap.ui.getCore().byId('createNewFragmentLink').setEnabled(false);
                } else {
                    // @ts-ignore
                    // sap.ui.getCore().byId('createNewFragmentLink').setEnabled(true);
                }
                oModel.setProperty('/selectedAggregation/key', selectedKey);
                oModel.setProperty('/selectedAggregation/value', selectedItem);

                const newSelectedControlChildren = Object.keys(
                    that.getControlAggregationByName(runtimeControl, selectedItem)
                );

                let updatedIndexArray = [];
                if (newSelectedControlChildren.length === 0) {
                    // @ts-ignore
                    updatedIndexArray.push({ key: 0, value: 0 });
                } else {
                    // @ts-ignore
                    updatedIndexArray = newSelectedControlChildren.map(function (elem, index) {
                        return { key: index + 1, value: parseInt(elem) + 1 };
                    });
                    // @ts-ignore
                    updatedIndexArray.unshift({ key: 0, value: 0 });
                    // @ts-ignore
                    updatedIndexArray.push({
                        key: newSelectedControlChildren.length + 1,
                        value: newSelectedControlChildren.length + 1
                    });
                }
                oModel.setProperty('/index', updatedIndexArray);
                oModel.setProperty('/selectedIndex', updatedIndexArray.length - 1);

                // that._oEditorContentLayout
                //     .getCanvas()
                //     .getController()
                //     .getIndexForSelectedAggregation(selectedItem)
                //     .then(function (aIndex) {
                //         oModel.setProperty('/indexHandlingFlag', aIndex.allowIndexForSelectedAggregation);
                //         let aIndexArray = [];
                //         if (aIndex.childElements.length !== 0) {
                //             aIndexArray = aIndex.childElements.map(function (elem, index) {
                //                 return { key: index + 1, value: elem + 1 };
                //             });
                //             aIndexArray.unshift({ key: 0, value: 0 });
                //             aIndexArray.push({
                //                 key: aIndex.childElements.length + 1,
                //                 value: aIndex.childElements.length + 1
                //             });
                //         } else {
                //             aIndexArray.push({ key: 0, value: 0 });
                //         }
                //         oModel.setProperty('/index', aIndexArray);
                //         oModel.setProperty('/selectedIndex', aIndexArray.length - 1);
                //         const sFragmentPath = oModel.getProperty('/fragmentFolderPath');
                //         const oCurrentSelection = oModel.getProperty('/currentSelection');
                //         const oFragmentList = sap.ui.getCore().byId('filteredFragmentList');
                //         that.getFragmentFiles(sFragmentPath, oFragmentList, oCurrentSelection).then(function () {
                //             const bEnabled = !!(that._getFilteredFragmentListSelectedItem() && selectedItem);
                //             that._getFragmentDialogBeginButton().setEnabled(bEnabled);
                //         });
                //     });
            }
        }).bindAggregation(
            'items',
            '/targetAggregation',
            // @ts-ignore
            new Item({
                key: '{key}',
                text: '{value}'
            })
        );
        const oIndexComboBox = new ComboBox({
            change: function (oEvent) {
                const sSelectedIndex = oEvent.oSource.getSelectedItem().getText();
                oModel.setProperty('/selectedIndex', parseInt(sSelectedIndex));
            },
            selectedKey: '{/selectedIndex}',
            enabled: true
        }).bindAggregation(
            'items',
            '/index',
            // @ts-ignore
            new sap.ui.core.Item({
                key: '{key}',
                text: '{value}',
                enabled: true
            })
        );

        // const oPopoverIndexField = new Popover('popoverr1', {
        //     placement: PlacementType.Bottom,
        //     showHeader: false,
        //     offsetX: 20,
        //     contentWidth: '22rem',
        //     showArrow: false,
        //     content: new Text()
        // });
        const oIndexFieldHelpIcon = new sap.ui.core.Icon({
            src: 'sap-icon://message-information',
            size: '1rem',
            visible: {
                path: '/indexHandlingFlag',
                formatter: function (oValue) {
                    if (oValue) {
                        return false;
                    }
                    return true;
                }
            },
            press: function () {
                // oPopoverIndexField
                //     .getContent()[0]
                //     .setText(
                //         that.context.i18n.getText('UIAdaptationFragment_fragment_index_uneditable', [
                //             oModel.getProperty('/selectedControlName')
                //         ])
                //     );
                // oPopoverIndexField.openBy(this);
            }
        }).addStyleClass('uiadaptationFragmentIndexHelpIcon');

        const oSelectFragmentLayout = new sap.ui.layout.VerticalLayout({
            width: '100%',
            content: [
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Control type'
                        }),
                        new ToolbarSpacer({
                            width: '3.4rem'
                        }),
                        new Label({
                            // @ts-ignore
                            text: control.name
                        })
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Target Aggregation'
                        }),
                        new ToolbarSpacer({
                            width: '1rem'
                        }),
                        oControlAggregationComboBox
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Index'
                        }),
                        new ToolbarSpacer({
                            width: '6rem'
                        }),
                        oIndexComboBox,
                        oIndexFieldHelpIcon
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),

                new SearchField('filteredFragmentSearchField', {
                    placeholder: 'Search Fragments',
                    liveChange: function (oEvent) {
                        const aFilters = [];
                        const sValue = oEvent.getSource().getValue();
                        if (sValue && sValue.length > 0) {
                            const oFilterName = new sap.ui.model.Filter(
                                'fragmentName',
                                sap.ui.model.FilterOperator.Contains,
                                sValue
                            );
                            const oFilter = new sap.ui.model.Filter({
                                filters: [oFilterName],
                                and: false
                            });
                            aFilters.push(oFilter);
                            if (!jQuery.isEmptyObject(oFragmentList.getBinding('items'))) {
                                // @ts-ignore
                                oFragmentList.getBinding('items').filter(aFilters);
                            }
                        } else if (!jQuery.isEmptyObject(oFragmentList.getBinding('items'))) {
                            // @ts-ignore
                            oFragmentList.getBinding('items').filter([]);
                        }
                        oModel.setProperty('/fragmentCount', oFragmentList.getItems().length);
                    },
                    search: function (oEvent) {
                        const bClearBtnPressed = oEvent.getParameters().clearButtonPressed;
                        // @ts-ignore
                        if (bClearBtnPressed && !jQuery.isEmptyObject(oFragmentList.getBinding('items'))) {
                            // @ts-ignore
                            oFragmentList.getBinding('items').filter([]);
                        }
                    }
                }),
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: {
                                path: '/fragmentCount',
                                formatter: function (oValue) {
                                    if (oValue !== undefined) {
                                        return oValue + ' ' + 'Fragments';
                                    } else {
                                        return '0' + ' ' + 'Fragments';
                                    }
                                }
                            }
                        }),
                        new ToolbarSpacer({
                            width: '24rem'
                        }),
                        new Link({
                            text: 'Create new',
                            press: function (oEvent) {
                                bAddFragment = false;
                                oFragmentNameInput.setValue('');
                                fragmentDialog.getBeginButton().setEnabled(false);
                                // @ts-ignore
                                fragmentDialog.getCustomHeader().getContentLeft()[0].setVisible(true);
                                fragmentDialog.getBeginButton().setText('Create');
                                fragmentDialog.getContent()[0].setVisible(false);
                                fragmentDialog.getContent()[1].setVisible(true);
                            },
                            enabled: oModel.getProperty('/selectedAggregation/value') ? true : false
                        }).addStyleClass('uiadaptationFragmentDialogLink')
                    ]
                }).addStyleClass('sapUiTinyMarginBottom'),
                oFragmentList
            ]
        });

        const oCreateFragmentLayout = new sap.ui.layout.VerticalLayout({
            visible: false,
            width: '100%',
            content: [
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Selected Aggregation',
                            vAlign: sap.ui.core.VerticalAlign.Bottom
                        }),
                        new ToolbarSpacer({
                            width: '1.5rem'
                        }),
                        new Label({
                            text: {
                                path: '/selectedAggregation/value',
                                formatter: function (oValue) {
                                    if (oValue) return oValue.charAt(0).toUpperCase() + oValue.slice(1);
                                }
                            }
                        })
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Selected Index',
                            vAlign: sap.ui.core.VerticalAlign.Middle
                        }),
                        new ToolbarSpacer({
                            width: '4rem'
                        }),
                        new Label({
                            text: '{/selectedIndex}'
                        })
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new sap.ui.layout.HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Fragment Name',
                            vAlign: sap.ui.core.VerticalAlign.Middle
                        }),
                        new ToolbarSpacer({
                            width: '3.5rem'
                        }),
                        oFragmentNameInput
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom')
            ]
        });
        var fragmentDialog = new Dialog({
            content: [oSelectFragmentLayout, oCreateFragmentLayout],
            contentWidth: '600px',

            escapeHandler: function () {
                fragmentDialog.close();
                fragmentDialog.destroy();
                fragmentDialog = null;
                // oModel = null;
            },
            beginButton: new Button({
                text: 'Add',
                enabled: false,
                type: ButtonType.Emphasized,
                press: async function (oEvent) {
                    oEvent.getSource().setEnabled(false);
                    if (!bAddFragment) {
                        // Need to create a new fragment and a respective change file
                        const fragmentNameToCreate = oModel.getProperty('/fragmentNameToCreate');
                        await that.createNewFragment(
                            {
                                fragmentName: fragmentNameToCreate,
                                index: oModel.getProperty('/selectedIndex'),
                                targetAggregation: oModel.getProperty('/selectedAggregation/value')
                            },
                            runtimeControl
                        );
                        fragmentDialog.close();
                        fragmentDialog.destroy();
                    } else {
                        const sSelectedFragmentName = oModel.getProperty('/SelectedFragment/selectedFragmentName');
                        // Create a change file for already existing XML Fragment
                    }
                    // if (bAddFragment) {
                    //     const sSelectedFragmentPath = oModel.getProperty(
                    //         '/SelectedFragment/selectedFragmentPath'
                    //     );
                    //     const sSelectedFragmentName = oModel.getProperty(
                    //         '/SelectedFragment/selectedFragmentName'
                    //     );
                    //     return that.context.service.filesystem.documentProvider
                    //         .getDocument(sSelectedFragmentPath)
                    //         .then(function (oFragment) {
                    //             return oFragment.getContent().then(function (sFragmentContent) {
                    //                 const oSelectedFragment = {
                    //                     selectedFragmentPath: 'fragments/' + sSelectedFragmentName,
                    //                     selectedFragmentContent: sFragmentContent,
                    //                     selectedFragmentName: sSelectedFragmentName,
                    //                     isCommandUndoRequired: false,
                    //                     selectedIndex: oModel.getProperty('/selectedIndex'),
                    //                     isExtensionPoint: bIsSelectionExtPoint
                    //                 };
                    //                 const sTargetSelection =
                    //                     oModel.getProperty('/selectedAggregation/value');
                    //                 if (bIsSelectionExtPoint) {
                    //                     oSelectedFragment.extensionPointName = sTargetSelection;
                    //                 } else {
                    //                     oSelectedFragment.selectedTargetAggregation = sTargetSelection;
                    //                 }
                    //                 return that._oEditorContentLayout
                    //                     .getCanvas()
                    //                     .getController()
                    //                     .onAddSelectedFragmentonControl(oSelectedFragment)
                    //                     .then(function () {
                    //                         return fragmentDialog.close();
                    //                     });
                    //             });
                    //         });
                    // } else {
                    //     return that._createFragmentFolder(oEvent);
                    // }
                }.bind(this)
            }),
            endButton: new Button({
                text: 'Cancel',
                press: function () {
                    fragmentDialog.close();
                    fragmentDialog.destroy();
                }.bind(this)
            }),
            customHeader: new Bar({
                contentLeft: [
                    new Button({
                        icon: 'sap-icon://nav-back',
                        visible: false,
                        press: function (oEvent) {
                            oEvent.getSource().setVisible(false);
                            bAddFragment = true;
                            fragmentDialog.getBeginButton().setText('Add');
                            fragmentDialog.getContent()[1].setVisible(false);
                            fragmentDialog.getContent()[0].setVisible(true);
                        }
                    })
                ],
                contentMiddle: [
                    new Text({
                        text: 'Add Fragment'
                    })
                ]
            })
        }).setModel(oModel);

        fragmentDialog.addStyleClass('sapUiRTABorder').addStyleClass('sapUiResponsivePadding--content');
        fragmentDialog.open();
    }

    /**
     * @description Creates a new fragment for the specified control
     * @param overlays Overlays
     */
    public async createNewFragment({ fragmentName, index, targetAggregation }, runtimeControl: any): Promise<void> {
        try {
            const options: RequestInit = {
                body: JSON.stringify({ fragmentName }),
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const res: Response = await fetch('./UIAdaptation/api/writeFragment', options);
            const resText = await res.text();

            if (res.status !== 201) {
                throw new Error(
                    `Error writing a fragment. Response: ${res.status} ${res.statusText}. ${resText ?? ''}`
                );
            }
            sap.m.MessageToast.show(resText);
            // Send message to the frontend that the fragment has been successfully created.
            console.info(resText);
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            console.error(e.message);
            return;
        }

        // TODO: Create a new change that points to that XML Fragment

        const flexSettings = {
            baseId: 'sap.ui.demoapps.rta.fiorielements',
            developerMode: true,
            layer: 'VENDOR',
            namespace: 'apps/sap.ui.demoapps.rta.fiorielements/changes/',
            projectId: 'adp.v2app',
            rootNamespace: 'apps/sap.ui.demoapps.rta.fiorielements/',
            scenario: undefined
        };

        const designMetadata = sap.ui.dt.OverlayRegistry.getOverlay(runtimeControl).getDesignTimeMetadata();

        const modifiedValue = {
            fragment:
                "<!-- Use stable and unique IDs!-->\n<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\n\t<!--  add your xml here -->\n</core:FragmentDefinition>",
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            index: index ?? 0,
            targetAggregation: targetAggregation ?? 'content'
        };

        const command = await sap.ui.rta.command.CommandFactory.getCommandFor(
            runtimeControl,
            'addXML',
            modifiedValue,
            designMetadata,
            flexSettings
        );

        // await sap.ui.rta.command.CommandFactory.getCommandFor<sap.ui.rta.command.FlexCommand>(
        //     modifiedControl,
        //     changeType,
        //     modifiedValue,
        //     null,
        //     flexSettings
        // );

        await this.rta.getCommandStack().pushAndExecute(command);

        // TODO?: Send message to the app context that the change has been successfully created.
    }
}
