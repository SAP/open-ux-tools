import ListReport from "sap/fe/test/ListReport";

export const actions = {};

export const assertions = {};

export default new ListReport(
    {
        appId: "<%- appID %>",
        componentId: "<%- componentID %>",
        entitySet: "<%- locals.entitySet || '' %>",
        contextPath: "<%- locals.contextPath || '' %>"
    },
    { actions, assertions }
);
