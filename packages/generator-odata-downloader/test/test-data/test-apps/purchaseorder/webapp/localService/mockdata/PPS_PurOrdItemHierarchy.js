module.exports = {
    // See: https://github.com/SAP/open-ux-odata/blob/main/docs/MockserverAPI.md#getreferentialconstraints
    getReferentialConstraints: function (navigationProperty) {
        if (navigationProperty.name === "_Parent") {
            return [
                {
                    "sourceProperty": "PurchaseOrderItem",
                    "targetProperty": "PurchasingParentItem"
                }
            ];
        }
        return undefined;
    }
};
