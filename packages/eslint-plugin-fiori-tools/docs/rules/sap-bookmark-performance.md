# Check your setting of _serviceRefreshInterval_(sap-bookmark-performance)

While deciding which interval to use, one has to keep in mind, that there might be thousands of users which have the Launchpad open and might display some KPIs. With a too small refresh Interval this can create a considerable work load in the back end. Therefore we recommend the following values as default depending on the use case.

1. Complex calculations are required to calculate the data on the tile, which might take multiple seconds to be calculated -> No auto refresh must be used. Set the Interval to 0.
2. Only a simple query is required (e.g. determine the number of tasks I’m assigned to) out of one central table -> Interval should be set to 300 (5 Minutes).

_Warning Message_: A value of more than 0 and less than 300 for the property `serviceRefreshIntervall` may result in performance limitations.

The following patterns are considered warnings:

```js

            function _extractDiscoveryCollection(oCollection) {
                var onInit = function() {
                var oView = this.getView(),
                oAddToHome = oView.byId("addToHome");

                oAddToHome.setAppData({
                title:    "My Bookmark",           // default: ""
                serviceUrl: "/any/service/$count", // default: undefined, string or a JS function
                // should raise an error
                serviceRefreshInterval: 1,       // default: undefined
                customUrl: "http://www.sap.com"    // default: undefined, string or a JS function
            });
        };

        oAddToHome.setServiceRefreshInterval(299);
```

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

