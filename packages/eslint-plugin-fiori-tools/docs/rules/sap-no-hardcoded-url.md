# Disallow use of hardcoded URLs (sap-no-hardcoded-url)

Fiori guidelines do not allow usage of hardcoded URLs to internal or external systems.:

## Rule Details

Instead of references to internal system in your URLs, you should only reference the path to the resource.

Allowed URLs are:

`http://www.w3.org/`, `http://www.sap.com/Protocols/`, `http://www.sap.com/adt`, `http://localhost/offline/`, `https://localhost/offline/`

The following patterns are considered warnings:

```js
serviceUrl: URI("http://ldc.example.com:50000/sap/opu/odata/sap/XXXX/").directory(),
```

```js
serviceUrl: 'proxy/http/ldc.example.com:50000/sap/opu/odata/sap/XXXX/';
```

The following patterns are not considered warnings:

```js
serviceUrl: "/sap/opu/odata/sap/XXXX/",
```

## Bug report

In case you think the finding is a false positive please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
