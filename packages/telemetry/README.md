# @sap-ux/telemetry

This library is used by SAP Fiori tools to collect anonymous usage data to guide Fiori tools improvement. This library is
specific for SAP Fiori tools's telemtry infrastrcture deployed on Azure cloud and it is built on Azure Application Insight node.js client. It is open sourced becaused some open sourced modules of Fiori tools need it for collecting usage data.


## Installation
Npm
`npm install --save @sap-ux/telemetry`

Yarn
`yarn add @sap-ux/telemetry`

Pnpm
`pnpm add @sap-ux/telemetry`

## Example Usage

See code in example folder for basic usage. To run example:

```shell
# At project root folder of @sap-ux/telemetry
cd package/telemetry
# Create a file with name .env
# Add this line in .env file OpenUxTools_ResourceId=<your_azure_instrument_key>
pnpm example
```