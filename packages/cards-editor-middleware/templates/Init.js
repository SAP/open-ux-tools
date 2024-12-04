function parseUI5Version(version) {
    const versionParts = version.split('.');
    const major = parseInt(versionParts[0], 10);
    const minor = parseInt(versionParts[1], 10);

    return { major, minor };
}

function isLowerThanMinimalUi5Version(version, minVersion) {
    if (version && minVersion) {
        const minVersionParsed = { major: 1, minor: 121 };
        const ui5VersionParsed = parseUI5Version(version);
        if (!isNaN(ui5VersionParsed.major) && !isNaN(ui5VersionParsed.minor)) {
            if (ui5VersionParsed.major < minVersionParsed.major) {
                return true;
            }
            if (ui5VersionParsed.major === minVersionParsed.major && ui5VersionParsed.minor < minVersionParsed.minor) {
                return true;
            }
        }
    }
    return false;
}

function addCardGenerationUserAction(oComponentInstance) {
    sap.ui.require([
        "sap/cards/ap/generator/CardGenerator",
        "sap/ushell/Container"
    ], async (CardGenerator, Container) => {
        const oRenderer = await Container.getServiceAsync("fiori2");
        if (oRenderer) {
            var generateCardBtn = {
                controlType: "sap.ushell.ui.launchpad.ActionItem",
                bCurrentState: true,
                oControlProperties: {
                    icon: "sap-icon://add",
                    id: "generate_card",
                    text: "Generate Card",
                    tooltip: "Generate Card",
                    press: function () {
                        CardGenerator.initializeAsync(oComponentInstance);
                    }
                },
                bIsVisible: true
            };
            oRenderer.addUserAction(generateCardBtn);
        }
    });
}

sap.ui.require(["sap/ushell/Container", "sap/m/MessageBox", "sap/ui/VersionInfo"], async (Container, MessageBox, VersionInfo) => {
    Container.attachRendererCreatedEvent(function() {
        Container.getServiceAsync('AppLifeCycle').then((serviceInstance) => {
            serviceInstance.attachAppLoaded(async (event) => {
                const sapCoreVersionInfo = await VersionInfo.load({
                    library: "sap.ui.core"
                });
                const sapCoreVersion = sapCoreVersionInfo?.version;
                if (isLowerThanMinimalUi5Version(sapCoreVersion, "1.121")) {
                    MessageBox.error("Card Generation feature is not supported for the current UI5 version. Please use UI5 version 1.121 or higher.");
                    return;
                }
                var oCurrentApplication = serviceInstance.getCurrentApplication();
                var oComponentInstance = oCurrentApplication.componentInstance;
                addCardGenerationUserAction(oComponentInstance);
            });
        });
    });
    Container.createRendererInternal(undefined, true).then(function(oRenderer){
        oRenderer.placeAt("content");
    });  
});


