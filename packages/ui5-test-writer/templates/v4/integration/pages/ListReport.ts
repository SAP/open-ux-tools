import ListReport from "sap/fe/test/ListReport";

const CustomPageDefinitions = {
    actions: {},
    assertions: {}
};

export default new ListReport(
    {
        appId: "<%- appID %>",
        componentId: "<%- componentID %>",
        entitySet: "<%- locals.entitySet || '' %>",
        contextPath: "<%- locals.contextPath || '' %>"
    },
    CustomPageDefinitions
);
