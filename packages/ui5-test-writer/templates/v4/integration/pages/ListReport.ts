import ListReport from "sap/fe/test/ListReport";

export const actions = {};

export const assertions = {};

export default new ListReport(
    {
        appId: "<%- appID %>",
        componentId: "<%- componentID %>",<% if (locals.contextPath) { %>
        contextPath: "<%- contextPath %>"<% } else if (locals.entitySet) { %>
        entitySet: "<%- entitySet %>"<% } %>
    } as ConstructorParameters<typeof ListReport>[0],
    { actions, assertions }
);
