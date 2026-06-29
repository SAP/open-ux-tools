import JourneyRunner from "sap/fe/test/JourneyRunner";
import ListReport from "sap/fe/test/ListReport";
import ObjectPage from "sap/fe/test/ObjectPage";
import CustomBooksListGenerated from "./BooksList.gen";
import CustomBooksObjectPageGenerated from "./BooksObjectPage.gen";

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("testNameSpace/alpv4captypescript") + "/test/flp.html#app-preview",
    pages: {
        onTheBooksListGenerated: new ListReport(
            {
                appId: "testNameSpace.alpv4captypescript",
                componentId: "BooksList",
                entitySet: "Books"
            },
            CustomBooksListGenerated
        ),
        onTheBooksObjectPageGenerated: new ObjectPage(
            {
                appId: "testNameSpace.alpv4captypescript",
                componentId: "BooksObjectPage",
                entitySet: "Books"
            },
            CustomBooksObjectPageGenerated
        )
    },
    async: true
});

export default runner;
