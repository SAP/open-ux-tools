## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br><%= locals.generationDate %>|
|**App Generator**<br><%= generatorName %>|
|**App Generator Version**<br><%= generatorVersion %>|
|**Generation Platform**<br><%= locals.generatorPlatform %>|
|**Template Used**<br><%= template %>|
|**Service Type**<br><%= locals.serviceType %>|<% if(locals.metadataFilename) { %>
|**Metadata File**<br><%= locals.metadataFilename %>|<% } else { %>
|**Service URL**<br><%= locals.serviceUrl ? locals.serviceUrl : 'N/A' %>|<% } %>
|**Module Name**<br><%= appName %>|
|**Application Title**<br><%= appTitle %>|
|**Namespace**<br><%= appNamespace %>|
|**UI5 Theme**<br><%= ui5Theme %>|
|**UI5 Version**<br><%= ui5Version %>|
|**Enable Code Assist Libraries**<br><% if(locals.enableCodeAssist === true) { %><%= "True" %><% } else { %><%= "False" %><% }%>|
|**Enable TypeScript**<br><% if(locals.enableTypeScript === true) { %><%= "True" %><% } else { %><%= "False" %><% }%>|
|**Add Eslint configuration**<br><% if(locals.enableEslint === true) { %><%= "True, see https://www.npmjs.com/package/eslint-plugin-fiori-custom for the eslint rules." %><% } else { %><%= "False" %><% }%>|<% if (locals.additionalEntries) locals.additionalEntries.forEach(entry => { %>
|**<%= entry.label %>**<br><%= entry.value %>|<%})%>

## <%= appName %>

<%= appDescription %>

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  <%= locals.launchText %><% if(locals.showMockDataInfo) {%>

- It is also possible to run the application using mock data that reflects the OData Service URL supplied during application generation.  In order to run the application with Mock Data, run the following from the generated app root folder:

```
    npm run start-mock
```<%}%>

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)


