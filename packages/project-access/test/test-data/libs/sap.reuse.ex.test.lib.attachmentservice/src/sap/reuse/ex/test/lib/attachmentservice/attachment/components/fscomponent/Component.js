sap.ui.define(['sap/se/mi/plm/lib/attachmentservice/attachment/Component'], function (AttachmentComponent) {
    'use strict';

    var Component = AttachmentComponent.extend(
        'sap.reuse.ex.test.lib.attachmentservice.attachment.components.fscomponent.Component',
        {
            metadata: {
                id: 'attachmentServiceComponent',
                manifest: 'json',
                library: 'sap.reuse.ex.test.lib.attachmentservice',
                publicMethods: ['save', 'cancel', 'refresh', 'getApplicationState', 'getAttachmentCount']
            }
        }
    );

    return Component;
});
