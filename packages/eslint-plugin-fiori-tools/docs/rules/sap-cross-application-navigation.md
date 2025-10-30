# No static cross-application navigation targets (sap-cross-application-navigation)

Fiori-as-a-Service Enablement Guideline prohibits the use of static list of cross-application navigation targets.

## Rule Details

This rule should prevent the usage of static cross-application navigation targets.

Use the isIntentSupported function of the CrossApplicationNavigation service. See the according Cross Application Navigation and JSDOC API documentation. Note that the function is mass-enabled, you could check an array of all relevant navigation targets in one call.

The following patterns are considered warnings:

```js
sap.ushell.Container.getService('CrossApplicationNavigation').toExternal({});
```

The following patterns are not warnings:

```js

checkPromoFactSheetAvailable : function() {
    // By default: promo factsheet not available
    this._bPromoFactSheetAvailable = false;
    if (this._oCrossAppNav) {
        // Check if the intent for the promotion factsheet is supported
        var sIntent = "#Promotion-displayFactSheet";
        var oDeferred = this._oCrossAppNav.isIntentSupported([sIntent]);
        oDeferred.done(jQuery.proxy(function(oIntentSupported) {
            if (oIntentSupported && oIntentSupported[sIntent] && oIntentSupported[sIntent].supported === true) {
                // Remember that the navigation to the promotion factsheet is possible
                this._bPromoFactSheetAvailable = true;
                // Activate the promotion links if they were already added to the view
                this.activatePromotionLinks();
            }
        }, this));
    }

```

## Bug report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading
