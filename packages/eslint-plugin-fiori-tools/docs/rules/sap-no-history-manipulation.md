# Discourage direct history manipulation (sap-no-history-manipulation)

## Rule details

Warning message: _Direct history manipulation, does not work with deep links, use router and navigation events instead_

The following patterns are considered warnings:

```js
window.history.back();
```

```js
history.go(-3);
```

```js
var personalHistory = window.history;
personalHistory.back();
```

The following patterns are NOT considered warnings:

```js
myNavBack : function(sRoute, mData) {
    var oHistory = sap.ui.core.routing.History.getInstance();
    var sPreviousHash = oHistory.getPreviousHash();
    //The history contains a previous entry
    if (sPreviousHash !== undefined) {
        window.history.go(-1);
    } else {
        var bReplace = true; // otherwise we go backwards with a forward history
        this.navTo(sRoute, mData, bReplace)
    }
},
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further reading

