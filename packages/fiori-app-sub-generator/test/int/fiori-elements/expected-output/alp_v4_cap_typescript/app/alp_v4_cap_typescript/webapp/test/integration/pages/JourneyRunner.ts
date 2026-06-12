import JourneyRunner from "sap/fe/test/JourneyRunner";
import ListReport from "sap/fe/test/ListReport";
import ObjectPage from "sap/fe/test/ObjectPage";
import CustomBooksList from "./BooksList";
import CustomBooksObjectPage from "./BooksObjectPage";

const runner = new JourneyRunner({
    launchUrl: sap.ui.require.toUrl("testNameSpace/alpv4captypescript") + "/test/flp.html#app-preview",
    pages: {
        onTheBooksList: new ListReport(
            {
                appId: "testNameSpace.alpv4captypescript",
                componentId: "BooksList",
                entitySet: "Books",
                contextPath: ""
            },
            CustomBooksList
        ),
        onTheBooksObjectPage: new ObjectPage(
            {
                appId: "testNameSpace.alpv4captypescript",
                componentId: "BooksObjectPage",
                entitySet: "Books",
                contextPath: ""
            },
            CustomBooksObjectPage
        )
    },
    async: true
});

export default runner;
