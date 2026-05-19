import ObjectPage from "sap/fe/test/ObjectPage";
import type Opa5 from "sap/ui/test/Opa5";
import Press from "sap/ui/test/actions/Press";

export const actions = {
    iPressSectionIconTabFilterButton(this: Opa5, section: string) {
        return this.waitFor({
            id: new RegExp(`.*--fe::FacetSection::${section}-anchor$`),
            actions: new Press()
        });
    }
};

export const assertions = {};

export default new ObjectPage(
    {
        appId: "<%- appID %>",
        componentId: "<%- componentID %>",
        entitySet: "<%- locals.entitySet || '' %>",
        contextPath: "<%- locals.contextPath || '' %>"
    },
    { actions, assertions }
);
