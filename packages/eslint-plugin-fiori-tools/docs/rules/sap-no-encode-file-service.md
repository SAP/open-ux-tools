# Detect the usage of encode file service (sap-no-encode-file-service)

The encode_file service is deprecated and not available on HCP.

## Rule Details

The rule detects the usage of the string `/sap/bc/ui2/encode_file`.

The following patterns are considered warnings:

```js
oFileUpload.setEncodeUrl(
  '/sap/bc/ui2/encode_file' + (sUrlParams ? '?' + sUrlParams : '')
);
var service = '/sap/bc/ui2/encode_file';
```

How to fix: Use the sap.m.UploadCollection with the sap.m.UploadCollectionItem instead.

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
