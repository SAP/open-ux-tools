
# SAP Fiori tools - Environment Check

<br>

## SAP System Details (1)

### Details for `ec1 no client`
🚫 &nbsp; V2 catalog service not available<br>
🚫 &nbsp; V4 catalog service not available<br>
🚫 &nbsp; ATO catalog is not available<br>
✅ &nbsp; SAPUI5 repository service (sap/opu/odata/UI5/ABAP_REPOSITORY_SRV) for deployment available<br>
🚫 &nbsp; Unable to retrieve available Transport Requests<br>

<br>

## Environment
Platform: `darwin`<br>
Development environment: `Visual Studio Code`<br>
|Tools/Extensions|Version|
|--|--|
|Node.js|16.17.0|
|Cloud CLI tools|7.2.0|
|SAP Fiori tools - Fiori generator|1.8.4-pre-20221212101721-87e071d0b.0|
|Application Wizard|1.9.2|
|SAP Fiori tools - Application Modeler|1.8.4-pre-20221212115359-2c7652c64.0|
|SAP Fiori tools - Guided Development|1.8.4-pre-20221212101721-87e071d0b.0|
|SAP Fiori tools - Service Modeler|1.8.4-pre-20221212101721-87e071d0b.0|
|SAP Fiori tools - XML Annotation Language Server|1.8.4-pre-20221212101721-87e071d0b.0|
|XML Toolkit|1.1.0|
|SAP CDS Language Support|6.3.1-20221211220329|
|UI5 Language Assistant Support|3.3.0|
<details><summary>Versions</summary>
<pre>
{
    "node": "16.17.0",
    "v8": "9.4.146.26-node.22",
    "uv": "1.43.0",
    "zlib": "1.2.11",
    "brotli": "1.0.9",
    "ares": "1.18.1",
    "modules": "93",
    "nghttp2": "1.47.0",
    "napi": "8",
    "llhttp": "6.0.7",
    "openssl": "1.1.1q+quic",
    "cldr": "41.0",
    "icu": "71.1",
    "tz": "2022a",
    "unicode": "14.0",
    "ngtcp2": "0.1.0-DEV",
    "nghttp3": "0.1.0-DEV"
}
</pre></details>

<br>

## Messages (28)
🟢 &nbsp; Info: Platform: darwin<br>
🟢 &nbsp; Info: Development environment: Visual Studio Code<br>
🟢 &nbsp; Info: Cloud CLI tools: 7.2.0<br>
🟢 &nbsp; Info: Application Wizard: 1.9.2<br>
🟢 &nbsp; Info: SAP Fiori tools - Fiori generator: 1.8.4-pre-20221212101721-87e071d0b.0<br>
🟢 &nbsp; Info: SAP Fiori tools - Application Modeler: 1.8.4-pre-20221212115359-2c7652c64.0<br>
🟢 &nbsp; Info: SAP Fiori tools - Guided Development: 1.8.4-pre-20221212101721-87e071d0b.0<br>
🟢 &nbsp; Info: SAP Fiori tools - Service Modeler: 1.8.4-pre-20221212101721-87e071d0b.0<br>
🟢 &nbsp; Info: SAP Fiori tools - XML Annotation Language Server: 1.8.4-pre-20221212101721-87e071d0b.0<br>
🟢 &nbsp; Info: XML Toolkit: 1.1.0<br>
🟢 &nbsp; Info: SAP CDS Language Support: 6.3.1-20221211220329<br>
🟢 &nbsp; Info: UI5 Language Assistant Support: 3.3.0<br>
🟢 &nbsp; Info: Versions: {
    "node": "16.17.0",
    "v8": "9.4.146.26-node.22",
    "uv": "1.43.0",
    "zlib": "1.2.11",
    "brotli": "1.0.9",
    "ares": "1.18.1",
    "modules": "93",
    "nghttp2": "1.47.0",
    "napi": "8",
    "llhttp": "6.0.7",
    "openssl": "1.1.1q+quic",
    "cldr": "41.0",
    "icu": "71.1",
    "tz": "2022a",
    "unicode": "14.0",
    "ngtcp2": "0.1.0-DEV",
    "nghttp3": "0.1.0-DEV"
}<br>
🟢 &nbsp; Info: Found 15 SAP systems<br>
🟢 &nbsp; Info: Getting details for SAP systems: ec1 no client<br>
🟢 &nbsp; Info: Checking SAP system ec1 no client<br>
<details><summary>ℹ Debug</summary>
<pre>
hybrid/read - id: [http://ccwdfgl9773.devint.net.sap:50000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN/100], filesystem: {
  name: 'ec1 no client',
  url: 'http://ccwdfgl9773.devint.net.sap:50000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN',
  client: '100',
  userDisplayName: 'I515700'
}
</pre></details>
<details><summary>ℹ Debug</summary>
<pre>
hybrid/read - id: [http://ccwdfgl9773.devint.net.sap:50000/sap/bc/gui/sap/its/webgui?sap-client=100&sap-language=EN/100]. Found sensitive data in secure store
</pre></details>
🔴 &nbsp; Error: Could not query v2 catalog service for ec1 no client<br>
<details><summary>ℹ Debug</summary>
<pre>
 Request to URL:  failed with message: Unexpected token < in JSON at position 0. Complete error object: SyntaxError: Unexpected token < in JSON at position 0
</pre></details>
🔴 &nbsp; Error: Could not query v4 catalog service for ec1 no client<br>
<details><summary>ℹ Debug</summary>
<pre>
 Request to URL:  failed with message: Unexpected token < in JSON at position 0. Complete error object: SyntaxError: Unexpected token < in JSON at position 0
</pre></details>
🔴 &nbsp; Error: Error retrieving ATO catalog<br>
<details><summary>ℹ Debug</summary>
<pre>
Cannot read properties of null (reading 'getAtoInfo')
</pre></details>
🟢 &nbsp; Info: SAPUI5 repository service for deployment available<br>
<details><summary>ℹ Debug</summary>
<pre>
Response status from SAPUI5 repository service: 200
</pre></details>
<details><summary>ℹ Debug</summary>
<pre>
Message from SAPUI5 repository service: OK
</pre></details>
🟡 &nbsp; Warning: Unable to retrieve available Transport Requests<br>

<sub>created at 2022-12-14 22:12:24 (UTC)</sub>
