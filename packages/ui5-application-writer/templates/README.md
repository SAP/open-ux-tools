## Application Details
|               |
| ------------- |
|**Generation Date and Time**<br><%= genDate %>|
|**App Generator**<br><%= genId %>|
|**App Generator Version**<br><%= genVersion %>|
|**Generation Platform**<br><%= genPlatform %>|
|**Template Used**<br><%= templateLabel %>|
|**Service Type**<br><%= dataSourceLabel %>|<% if(metadataFilename) { %>
|**Metadata File**<br><%= metadataFilename %><% } else { %>
|**Service URL**<br><%= serviceUrl %><%}%>
|**Module Name**<br><%= projectName %>|
|**Application Title**<br><%= projectTitle %>|
|**Namespace**<br><%= projectNamespace %>|
|**UI5 Theme**<br><%= ui5Theme %>|
|**UI5 Version**<br><% if (projectUI5Version==="") { %><%- "Latest" %><% } else { %><%- projectUI5Version %><% } %>|
|**Enable Code Assist Libraries**<br><% if(enableCodeAssist === true) { %><%= "True" %><% } else { %><%= "False" %><% }%>|
|**Enable TypeScript**<br><% if(enableTypeScript === true) { %><%= "True" %><% } else { %><%= "False" %><% }%>|
|**Add Eslint configuration**<br><% if(enableEslint === true) { %><%= "True, see https://www.npmjs.com/package/eslint-plugin-fiori-custom for the eslint rules." %><% } else { %><%= "False" %><% }%>|<% if (additionalEntries) additionalEntries.forEach(entry => { %>
|**<%= entry.label %>**<br><%= entry.value %>|<%})%>

## <%= projectName %>

<%= projectDescription %>

### Starting the generated app

-   This app has been generated using the SAP Fiori tools - App Generator, as part of the SAP Fiori tools suite.  <%= launchText %><% if(showMockDataInfo) {%>

- It is also possible to run the application using mock data that reflects the OData Service URL supplied during application generation.  In order to run the application with Mock Data, run the following from the generated app root folder:

```
    npm run start-mock
```<%}%>

#### Pre-requisites:

1. Active NodeJS LTS (Long Term Support) version and associated supported NPM version.  (See https://nodejs.org)


