sap.ui.define(['sap/ui/core/UIComponent', 'sap/suite/ui/generic/template/extensionAPI/ReuseComponentSupport'], function(
    UIComponent,
    ReuseComponentSupport
) {
    'use strict';

    var Component = UIComponent.extend(
        'sap.se.mi.plm.lib.attachmentservice.attachment.components.stcomponent.Component',
        {
            metadata: {
                id: 'attachmentServiceComponent',
                manifest: 'json',
                library: 'sap.se.mi.plm.lib.attachmentservice',
                publicMethods: ['save', 'cancel', 'refresh', 'getApplicationState', 'getAttachmentCount'],
                properties: {
                    mode: {
                        type: 'string',
                        group: 'Misc',
                        defaultValue: 'D'
                    },
                    objectKey: {
                        type: 'string',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    objectType: {
                        type: 'string',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    isDraft: {
                        type: 'boolean',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: false
                    },
                    isGuid: {
                        type: 'boolean',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: false
                    },
                    semanticObject: {
                        type: 'string',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    attachmentCount: {
                        type: 'int',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    attributeHandling: {
                        type: 'object',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    flavor: {
                        type: 'string',
                        group: 'Misc',
                        defaultValue: 'withoutCheckIn'
                    },
                    stIsAreaVisible: {
                        type: 'boolean',
                        group: 'standard'
                    },
                    documentType: {
                        type: 'string',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    sapObjectType: {
                        type: 'string',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    },
                    sapObjectNodeType: {
                        type: 'string',
                        group: 'Misc',
                        bindable: true,
                        defaultValue: null
                    }
                },
                events: {
                    onupload: {},
                    onrename: {},
                    ondelete: {}
                }
            },
            init: function() {
                (UIComponent.prototype.init || jQuery.noop).apply(this, arguments);
                //Transform this component into a reuse component for smart templates:
                ReuseComponentSupport.mixInto(this);
            },
            createContent: function() {
                this.page = new sap.ui.view({
                    id: 'attachmentService',
                    viewName: 'sap.se.mi.plm.lib.attachmentservice.attachment.view.Attachment',
                    type: sap.ui.core.mvc.ViewType.XML
                });
                if (this.getComponentData()) {
                    this.setModel(this.getComponentData().attachmentSettings, 'attachmentSettings');
                }
                return this.page;
            },
            setProperty: function(sName, oValue) {
                sap.ui.core.UIComponent.prototype.setProperty.apply(this, arguments);
            },
            stStart: function(oModel, oBindingContext, oExtensionAPI) {
                // var self = this;
                // if (self.page.getController().setProperties) {
                // 	self.page.getController().setProperties(self.getMode(), self.getObjectType(), self.getObjectKey(), self.getSemanticObject());
                // }
                this.oModel = oModel;
                this.oBindingContext = oBindingContext;
                this.oExtensionAPI = oExtensionAPI;
                this.setControllerProperties();

                // oExtensionAPI.attachPageDataLoaded(function() {
                // 	self.page.getController().setProperties(self.getMode(), self.getObjectType(), self.getObjectKey(), self.getSemanticObject());
                // });
                // oExtensionAPI.getTransactionController().attachAfterCancel(function() {
                // 	self.page.getController().setProperties(self.getMode(), self.getObjectType(), self.getObjectKey(), self.getSemanticObject());
                // });
            },
            stRefresh: function(oModel, oBindingContext, oExtensionAPI) {
                // var self = this;
                // if (self.page.getController().setProperties) {
                // 	self.page.getController().setProperties(self.getMode(), self.getObjectType(), self.getObjectKey(), self.getSemanticObject());
                // }
                this.oModel = oModel;
                this.oBindingContext = oBindingContext;
                this.oExtensionAPI = oExtensionAPI;
                this.setControllerProperties();
            },

            setStIsAreaVisible: function(bIsAreaVisible) {
                if (bIsAreaVisible !== this.getStIsAreaVisible()) {
                    this.setProperty('stIsAreaVisible', bIsAreaVisible);
                    this.setControllerProperties();
                }
            },

            setControllerProperties: function() {
                if (this.oBindingContext && this.getStIsAreaVisible()) {
                    var self = this;
                    if (self.page.getController().setProperties) {
                        self.page
                            .getController()
                            .setProperties(
                                self.getMode(),
                                self.getObjectType(),
                                self.getObjectKey(),
                                self.getSemanticObject(),
                                self.getDocumentType(),
                                self.getSapObjectType(),
                                self.getSapObjectNodeType()
                            );

                        this.oBindingContext = null;
                    }
                }
            },
            setMode: function(value) {
                this.setProperty('mode', value);
                this.page.getController().setModeProperty(value);
            },
            setAttributeHanding: function(value) {
                this.page.getController().setAttributes(value);
            },
            getAttributes: function() {
                return this.page.getController().getAttributeList();
            },
            setDocumentType: function(value) {
                this.page.getController().setDocTypeProperty(value);
            },
            setAttributes: function(attr) {
                this.page.getController().setAttributes(attr);
            },

            save: function(isReferesh, callback) {
                return this.page.getController().commitChanges(isReferesh, callback);
            },
            cancel: function(isReferesh, callback) {
                return this.page.getController().cancelChanges(isReferesh, callback);
            },
            refresh: function(asMode, objectType, objectKey, semanticObject, sapObjectType, sapObjectNodeType) {
                this.page
                    .getController()
                    .setProperties(
                        asMode,
                        objectType,
                        objectKey,
                        semanticObject,
                        null,
                        sapObjectType,
                        sapObjectNodeType
                    );
            },
            getApplicationState: function(callback) {
                return this.page.getController().getApplicationState(callback);
            },
            getAttachmentCount: function(callback) {
                return this.page.getController().getAttachmentCount(callback);
            }
        }
    );
    return Component;
});
