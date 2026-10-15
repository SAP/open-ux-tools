jQuery.sap.declare('cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.Component');
// use the load function for getting the optimized preload file if present
sap.ui.component.load({
    name: 'cross.fnd.fiori.inbox',
    // Use the below URL to run the extended application when SAP-delivered application is deployed on SAPUI5 ABAP Repository
    url: '/sap/bc/ui5_ui5/sap/CA_FIORI_INBOX' // we use a URL relative to our own component
    // extension application is deployed with customer namespace
});
this.cross.fnd.fiori.inbox.Component.extend('cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.Component', {
    metadata: {
        version: '1.0.0',
        config: {
            'sap.ca.i18Nconfigs': {
                'bundleName': 'cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.i18n.i18n'
            }
        },
        customizing: {
            'sap.ui.viewExtensions': {
                'cross.fnd.fiori.inbox.view.S2': {
                    'CustomerExtensionForObjectListItem': {
                        'className': 'sap.ui.core.Fragment',
                        'fragmentName':
                            'cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.view.S2_CustomerExtensionForObjectListItemCustom',
                        'type': 'XML'
                    }
                }
            },
            'sap.ui.viewReplacements': {
                'cross.fnd.fiori.inbox.view.S2': {
                    'viewName': 'cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.view.S2Custom',
                    'type': 'XML'
                }
            },
            'sap.ui.controllerExtensions': {
                'cross.fnd.fiori.inbox.view.S2': {
                    'controllerName': 'cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.view.S2Custom'
                },
                'cross.fnd.fiori.inbox.view.S3': {
                    'controllerName': 'cross.fnd.fiori.inbox.CA_FIORI_INBOXExtension.view.S3Custom'
                }
            }
        }
    }
});
