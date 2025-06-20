import Opa5 from "sap/ui/test/Opa5";

const sViewName = "View1";

export default class View1Page extends Opa5 {
	// Actions


	// Assertions
	iShouldSeeThePageView() {
		return this.waitFor({
			id: "page",
			viewName: sViewName,
			success: function () {
				Opa5.assert.ok(true, "The " + sViewName + " view is displayed");
			},
			errorMessage: "Did not find the " + sViewName + " view"
		});
	}

}


