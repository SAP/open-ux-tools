# Discourage usage of location (sap-no-location-usage)

This is a collection of usages of browser APIs that might lead to issues.
Please search for the warning messages that you see in ESLint to find the explanation of the respective check.

## Rule details

window.location.\* parameters should not be used directly.

### warning message:

- Usage of location.assign(),
- Direct Hash manipulation, use router instead,
- Usage of location.href, Override of location

The following patterns are considered warnings:

```js
location.assign(data.results[0].url);

var abc = location;

abc.href.split(' & ');

window.location.hash = '#foo';

window.location.hash.indexOf('-');

location = this.oNavParams.toOppApp;

window.location = this.oNavParams.toOppApp;
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further reading

