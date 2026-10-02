sap.ui.define(
    [
        'fin/central/listreport/reuse/controller/BaseController',
        'sap/ui/model/json/JSONModel',
        'sap/ui/Device',
        'sap/ui/comp/state/UIState',
        'fin/central/listreport/reuse/model/formatter',
        'sap/fe/navigation/NavigationHandler',
        'sap/fe/navigation/SelectionVariant',
        'sap/m/MessageToast',
        'sap/ui/table/plugins/MultiSelectionPlugin',
        'sap/ui/core/CustomData'
    ],
    function (
        BaseController,
        JSONModel,
        Device,
        UIState,
        formatter,
        NavigationHandler,
        SelectionVariant,
        MessageToast,
        MultiSelectionPlugin,
        CustomData
    ) {
        'use strict';

        return BaseController.extend('fin.central.listreport.reuse.controller.List', {
            // ---------------------------------------------
            // FIELDS
            // ---------------------------------------------

            //	oNavigationHandler
            //	oSmartFilterBar
            //	oSmartTable
            formatter: formatter,
            bOnInitFinished: false,
            bFilterBarInitialized: false,

            // ---------------------------------------------
            // INITIALIZATION
            // ---------------------------------------------

            onInit: function () {
                this.oSmartTable = this.byId('fin.central.listreport.reuse.SmartTable');
                this.oAnalyticalTable = this.byId('fin.central.listreport.reuse.list');
                this.oSmartFilterBar = this.byId('fin.central.listreport.reuse.SmartFilterBar');

                this.oRouter = this.getRouter(); // needed by the following constructor function call
                this.oNavigationHandler = new NavigationHandler(this);

                this.oShareActionSheet = null;

                var oRessouceBundle = this.getResourceBundle();
                var oResourceBundleM = sap.ui.getCore().getLibraryResourceBundle('sap.m');
                var iOriginalBusyDelay = this.oAnalyticalTable.getBusyIndicatorDelay();
                var fnGetUser = jQuery.sap.getObject('sap.ushell.Container.getUser');
                var bJamVisible = !!fnGetUser && fnGetUser().isJamActive();

                // share Model: holds all the sharing relevant texts and info
                var oShareModel = new JSONModel({
                    // BUTTON TEXTS
                    emailButtonText: oResourceBundleM.getText('SEMANTIC_CONTROL_SEND_EMAIL'),
                    jamButtonText: oResourceBundleM.getText('SEMANTIC_CONTROL_SHARE_IN_JAM'),
                    bookmarkButtonText: oResourceBundleM.getText('SEMANTIC_CONTROL_SAVE_AS_TILE'),
                    // BOOKMARK START
                    bookmarkTitle: oRessouceBundle.getText('BOOKMARK_TITLE'),
                    bookmarkSubtitle: oRessouceBundle.getText('BOOKMARK_SUBTITLE'),
                    bookmarkIcon: 'sap-icon://Fiori2/FBL5N', // TODO: when using this template, the icon has to be replaced by the app-specific icon
                    bookmarkCustomUrl: function () {
                        this.storeCurrentAppState();
                        return document.URL;
                    }.bind(this),
                    // BOOKMARK END
                    // EMAIL START
                    emailSubject: oRessouceBundle.getText('EMAIL_SUBJECT'),
                    // EMAIL END
                    // JAM START
                    jamVisible: bJamVisible,
                    jamTitle: oRessouceBundle.getText('SHARE_JAM_TITLE')
                    // JAM END
                });
                // view Model: view specific attributes
                var oViewModel = new JSONModel({
                    fullscreenTitle: oRessouceBundle.getText('FULLSCREEN_TITLE'),
                    tableBusyDelay: 0
                });

                // setting the models to the view
                this.setModel(oShareModel, 'share');
                this.setModel(oViewModel, 'listView');

                // message popover
                this.oMessagePopover = new sap.m.MessagePopover({
                    items: {
                        path: 'message>/',
                        template: new sap.m.MessagePopoverItem({
                            description: '{message>description}',
                            type: '{message>type}',
                            title: '{message>message}'
                        })
                    }
                });
                this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), 'message');
                this.oMessagePopover.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), 'message');

                // busy handling related
                this.oAnalyticalTable.attachEventOnce('updateFinished', function () {
                    oViewModel.setProperty('/tableBusyDelay', iOriginalBusyDelay);
                });

                this.bOnInitFinished = true;
                this.initAppState();

                this.getView().addCustomData(
                    new CustomData({
                        key: 'sap-ui-custom-settings',
                        value: {
                            'sap.ui.dt': {
                                'designtime': 'fin/central/listreport/reuse/designtime/List.designtime'
                            }
                        }
                    })
                );
            },

            onBeforeRendering: function () {
                var sCozyClass = 'sapUiSizeCozy',
                    sCompactClass = 'sapUiSizeCompact',
                    sCondensedClass = 'sapUiSizeCondensed';
                if (
                    jQuery(document.body).hasClass(sCompactClass) ||
                    this.getOwnerComponent().getContentDensityClass() === sCompactClass
                ) {
                    this.oSmartTable.addStyleClass(sCondensedClass);
                } else if (
                    jQuery(document.body).hasClass(sCozyClass) ||
                    this.getOwnerComponent().getContentDensityClass() === sCozyClass
                ) {
                    this.oSmartTable.addStyleClass(sCozyClass);
                }
            },

            initAppState: function () {
                // check if both init events for the controller and the SmartFilterBar have finished
                if (!(this.bFilterBarInitialized && this.bOnInitFinished)) {
                    return;
                }

                var oParseNavigationPromise = this.oNavigationHandler.parseNavigation();

                var that = this;
                oParseNavigationPromise.done(function (oAppData, oURLParameters, sNavType) {
                    if (sNavType !== sap.fe.navigation.NavType.initial) {
                        var bHasOnlyDefaults = oAppData && oAppData.bNavSelVarHasDefaultsOnly;
                        var oSelectionVariant = new SelectionVariant(oAppData.selectionVariant);
                        var aSelectionVariantProperties = oSelectionVariant
                            .getParameterNames()
                            .concat(oSelectionVariant.getSelectOptionsPropertyNames());
                        var mUIStateProperties = {
                            replace: true,
                            strictMode: false
                        };
                        var oUiState = new UIState({
                            selectionVariant: JSON.parse(oAppData.selectionVariant),
                            semanticDates: oAppData.semanticDates
                        });
                        for (var i = 0; i < aSelectionVariantProperties.length; i++) {
                            that.oSmartFilterBar.addFieldToAdvancedArea(aSelectionVariantProperties[i]);
                        }
                        if (!bHasOnlyDefaults || that.oSmartFilterBar.getCurrentVariantId() === '') {
                            that.oSmartFilterBar.clearVariantSelection();
                            that.oSmartFilterBar.clear();
                            that.oSmartFilterBar.setUiState(oUiState, mUIStateProperties);
                        }
                        if (oAppData.tableVariantId) {
                            that.oSmartTable.setCurrentVariantId(oAppData.tableVariantId);
                        }
                        that.restoreCustomAppStateData(oAppData.customData);
                        if (!bHasOnlyDefaults) {
                            that.oSmartFilterBar.search();
                        }
                    }
                });

                oParseNavigationPromise.fail(function (oError) {
                    that._handleError(oError);
                });
            },

            onAssignedFiltersChanged: function (oEvent) {
                this.byId('FilterText').setText(
                    this.byId('fin.central.listreport.reuse.SmartFilterBar').retrieveFiltersWithValuesAsText()
                );
            },

            handleMessagePopoverPress: function (oEvent) {
                this.oMessagePopover.openBy(oEvent.getSource());
            },

            // ---------------------------------------------
            // APP STATE HANDLING FOR BACK NAVIGATION
            // ---------------------------------------------

            /**
             * Changes the URL according to the current app state and stores the app state for later retrieval.
             */
            storeCurrentAppState: function () {
                var oAppStatePromise = this.oNavigationHandler.storeInnerAppState(this.getCurrentAppState());
                oAppStatePromise.done(
                    function (sAppStateKey) {
                        //your inner app state is saved now; sAppStateKey was added to URL
                        //perform actions that must run after save
                    }.bind(this)
                );
                oAppStatePromise.fail(
                    function (oError) {
                        this._handleError(oError);
                    }.bind(this)
                );
                return oAppStatePromise;
            },

            /**
             * @returns {object} the current app state consisting of the selection variant, the table variant and additional custom data
             */
            getCurrentAppState: function () {
                var oSelectionVariant = new SelectionVariant(
                    JSON.stringify(this.oSmartFilterBar.getUiState().getSelectionVariant())
                );
                return {
                    selectionVariant: oSelectionVariant.toJSONString(),
                    tableVariantId: this.oSmartTable.getCurrentVariantId(),
                    customData: this.getCustomAppStateData(),
                    semanticDates: this.oSmartFilterBar.getUiState().getSemanticDates()
                };
            },

            /**
             * @returns {object} an object of additional custom fields defining the app state (apart from the selection variant and the table variant)  
             */
            getCustomAppStateData: function () {
                return {
                    // add custom data for back navigation if necessary
                };
            },

            restoreCustomAppStateData: function (oCustomData) {
                // perform custom logic for restoring the custom data of the app state
            },

            /**
             * @returns {array} a list of selection fields in the SmartFilterBar with defaults
             */
            getVisibleSelectionsWithDefaults: function () {
                // We need a list of all selection fields in the SmartFilterBar for which defaults are defined
                // (see method setSmartFilterBarDefaults) and which are currently visible.
                // This is needed by _getBackNavigationParameters in the NavigationController.
                var aVisibleFields = [];
                //		if(this.oView.byId(this.sPrefix + ".DateKeyDate").getVisible()){
                //			aVisibleFields.push("KeyDate");
                //		}
                return aVisibleFields;
            },

            // ---------------------------------------------
            // FILTER BAR EVENTS
            // ---------------------------------------------

            onInitSmartFilterBar: function (oEvent) {
                this.bFilterBarInitialized = true;
                this.initAppState();
            },

            onSearch: function (oEvent) {
                // write inner app state
                this.storeCurrentAppState();
            },

            onReset: function (oEvent) {
                // TBD.
            },

            onBeforeVariantFetch: function (oEvent) {
                // TBD.
            },

            onAfterVariantLoad: function (oEvent) {
                // TBD.
            },

            // ---------------------------------------------
            // TABLE EVENTS
            // ---------------------------------------------

            onAfterTableVariantSave: function (oEvent) {
                // TBD.
            },

            onAfterApplyTableVariant: function (oEvent) {
                // write inner app state
                this.storeCurrentAppState();
            },

            onBeforeRebindTable: function (oEvent) {
                var oBindingParams = oEvent.getParameter('bindingParams');
                oBindingParams.parameters.autoExpandMode = 'Sequential';
            },

            // ---------------------------------------------
            // SMART LINK EVENTS
            // ---------------------------------------------
            // see https://wiki.wdf.sap.corp/wiki/display/ERPFINDEV/sFIN+UX+Fiori+Guidelines#sFINUXFioriGuidelines-SAPUI5SmartLinkControl

            onBeforePopoverOpens: function (oEvent) {
                var oParams = oEvent.getParameters();
                var sSelectionVariant = JSON.stringify(this.oSmartFilterBar.getUiState().getSelectionVariant());
                this.oNavigationHandler.processBeforeSmartLinkPopoverOpens(
                    oParams,
                    sSelectionVariant,
                    this.getCurrentAppState()
                );
            },

            onSmartLinkNavigate: function (oEvent) {
                this.storeCurrentAppState();
            },

            // ---------------------------------------------
            // COLLABORATION ACTIONS
            // ---------------------------------------------
            /**
             * Event handler when the share menu is opened
             * @public
             */
            onShareButtonPressed: function (oEvent) {
                if (!this.oShareActionSheet) {
                    this.oShareActionSheet = sap.ui.xmlfragment(
                        this.getView().getId(),
                        'fin.central.listreport.reuse.view.fragment.ShareSheet',
                        this
                    );
                }
                var oShareModel = new JSONModel();
                oShareModel = this.getModel('share');
                this.oShareActionSheet.setModel(oShareModel, 'share');
                this.oShareActionSheet.openBy(this.byId('ShareButton'));
                // this.oShareActionSheet.openBy(oEvent.getSource());
            },

            /**
             * Event handler when the share by E-Mail button has been clicked
             * @public
             */
            onShareEmailPressed: function () {
                this.storeCurrentAppState().done(
                    function () {
                        var oShareModel = this.getModel('share');
                        sap.m.URLHelper.triggerEmail(null, oShareModel.getProperty('/emailSubject'), document.URL);
                    }.bind(this)
                );
            },

            /**
             * Event handler when the share in JAM button has been clicked
             * @public
             */
            onShareInJamPress: function () {
                this.storeCurrentAppState().done(
                    function () {
                        var oShareModel = this.getModel('share'),
                            oShareDialog = sap.ui.getCore().createComponent({
                                name: 'sap.collaboration.components.fiori.sharing.dialog',
                                settings: {
                                    object: {
                                        id: document.URL,
                                        share: oShareModel.getProperty('/jamTitle')
                                    }
                                }
                            });
                        oShareDialog.open();
                    }.bind(this)
                );
            },

            /**
             * Event handler that changes the URL based on the current app state
             * before the bookmark button is pressed
             * @public
             */
            onBeforePressBookmark: function () {
                this.storeCurrentAppState();
            },

            // ---------------------------------------------
            // MISC
            // ---------------------------------------------

            _handleError: function (oError) {
                // Implement an appropriate error handling
            },

            onListNavBack: function () {
                var oHistory = sap.ui.core.routing.History.getInstance(),
                    sPreviousHash = oHistory.getPreviousHash(),
                    oCrossAppNavigator =
                        sap.ushell &&
                        sap.ushell.Container &&
                        sap.ushell.Container.getService('CrossApplicationNavigation');

                if (sPreviousHash !== undefined || !oCrossAppNavigator) {
                    // The history contains a previous entry
                    history.go(-1);
                } else if (oCrossAppNavigator) {
                    // Navigate back to FLP home
                    // TODO: Test this in a working sandbox, with the current version it is not possible
                    oCrossAppNavigator.toExternal({
                        target: {
                            shellHash: '#'
                        }
                    });
                }
            },

            myMethod_1_for_AdaptionProjects: function () {},

            myMethod_2_for_AdaptionProjects: function () {}
        });
    }
);
