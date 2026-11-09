jQuery.sap.declare('i2d.qm.defect.records1.Component');
sap.ui.getCore().loadLibrary('sap.ui.generic.app');
jQuery.sap.require('sap.ui.generic.app.AppComponent');

sap.ui.generic.app.AppComponent.extend('i2d.qm.defect.records1.Component', {
    metadata: {
        'manifest': 'json'
        /*,
		dependencies: {
			libs: ["sap.m", "sap.se.mi.plm.lib.attachmentservice"],
			 //components: ["sap.se.mi.plm.lib.attachmentservice.attachment"]
			 components: ["sap.se.mi.plm.lib.attachmentservice.attachment.components.stcomponent"]
		}*/
    }
});
