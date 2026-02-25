import TemplatePage from "sap/fe/test/TemplatePage";

const CustomPageDefinitions = {
	actions: {},
	assertions: {}
};

export default new TemplatePage(
	"<%= id %>::<%= entity %>Main",
	CustomPageDefinitions
);
