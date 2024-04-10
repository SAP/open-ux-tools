sap.ui.define(['sap/ui/core/UIComponent'], function (UIComponent) {
    'use strict';

    //test hello
    var Component = UIComponent.extend('sap.reuse.ex.test.lib.attachmentservice.attachment.Component', {
        metadata: {
            id: 'attachmentServiceComponent',
            manifest: 'json',
            library: 'sap.reuse.ex.test.lib.attachmentservice',
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
                semanticObject: {
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
        createContent: function () {
            this.page = new sap.ui.view({
                id: 'attachmentService',
                viewName: 'sap.reuse.ex.test.lib.attachmentservice.attachment.view.Attachment',
                type: sap.ui.core.mvc.ViewType.XML
            });
            return this.page;
        },
        setProperty: function (sName, oValue) {
            sap.ui.core.UIComponent.prototype.setProperty.apply(this, arguments);
        },
        setMode: function (value) {
            this.setProperty('mode', value);
            this.page.getController().setModeProperty(value);
        },
        setObjectKey: function (value) {
            this.setProperty('objectKey', value);
            this.page
                .getController()
                .setProperties(
                    this.getMode(),
                    this.getObjectType(),
                    value,
                    this.getSemanticObject(),
                    this.getDocumentType()
                );
        },
        setObjectType: function (value) {
            this.setProperty('objectType', value);
            this.page
                .getController()
                .setProperties(
                    this.getMode(),
                    value,
                    this.getObjectKey(),
                    this.getSemanticObject(),
                    this.getDocumentType()
                );
        },
        setSapObjectType: function (value) {
            this.setProperty('sapObjectType', value);
            this.page
                .getController()
                .setProperties(
                    this.getMode(),
                    this.getObjectType(),
                    this.getObjectKey(),
                    this.getSemanticObject(),
                    this.getDocumentType(),
                    this.getSapObjectType()
                );
        },
        setSapObjectNodeType: function (value) {
            this.setProperty('sapObjectNodeType', value);
            this.page
                .getController()
                .setProperties(
                    this.getMode(),
                    this.getObjectType(),
                    this.getObjectKey(),
                    this.getSemanticObject(),
                    this.getDocumentType(),
                    this.getSapObjectType(),
                    this.getSapObjectNodeType()
                );
        },
        setAttributeHanding: function (value) {
            this.page.getController().setAttributes(value);
        },
        getAttributes: function () {
            return this.page.getController().getAttributeList();
        },

        setAttributes: function (attr) {
            this.page.getController().setAttributes(attr);
        },
        setDocumentType: function (value) {
            this.page.getController().setDocTypeProperty(value);
        },

        save: function (isReferesh, callback) {
            return this.page.getController().commitChanges(isReferesh, callback);
        },
        cancel: function (isReferesh, callback) {
            return this.page.getController().cancelChanges(isReferesh, callback);
        },
        refresh: function (asMode, objectType, objectKey, semanticObject, sapObjectType, sapObjectNodeType) {
            this.page
                .getController()
                .setProperties(asMode, objectType, objectKey, semanticObject, null, sapObjectType, sapObjectNodeType);
        },
        getApplicationState: function (callback) {
            return this.page.getController().getApplicationState(callback);
        },

        getAttachmentCount: function (callback) {
            return this.page.getController().getAttachmentCount(callback);
        },
        getAllAttachments: function (attachmentList, callBack, suppressLogDownload) {
            return this.page.getController().onDownloadAll(attachmentList, callBack, suppressLogDownload);
        },
        downloadSingleAttachment: function (oParameters, downloadFromRep) {
            return this.page.getController().downloadDirectAttachments([oParameters], downloadFromRep);
        },
        downloadMultipleAttachments: function (aParams, downloadFromRep) {
            return this.page.getController().downloadDirectAttachments(aParams, downloadFromRep);
        },
        uploadFiles: function (oUploaderModel, callBack) {
            return this.page.getController().uploadFiles(oUploaderModel, callBack);
        },
        checkOutFile: function (oCheckoutModel, callBack) {
            return this.page.getController().checkOut(oCheckoutModel, callBack);
        },
        getAttachmentsByAlternateKey: function (objectType, objectKey, semanticObject, callBack) {
            return this.page
                .getController()
                .getAttachmentsByAlternateKey(objectType, objectKey, semanticObject, callBack);
        }
    });
    return Component;
});
