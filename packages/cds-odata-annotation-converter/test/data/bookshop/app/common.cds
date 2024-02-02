/*
  Common Annotations shared by all apps
*/

using { sap.capire.bookshop as my } from '../db/schema';


////////////////////////////////////////////////////////////////////////////
//
//	Books Lists
//
annotate my.Books with @(
	UI: {
		Identification: [{Value:title}],
	  SelectionFields: [ ID, author_author_ID, price, currency_code ],
		LineItem: [
			{Value: ID},
			{Value: title},
			{Value: author.name, Label:'{i18n>Author}'},
			{Value: stock},
			{Value: price},
			{Value: currency.symbol, Label:' '},
		]
	}
) {
	author @ValueList.entity:'Authors';
};

annotate my.Authors with @(
	UI: {
		Identification: [{Value:name}],
	}
);


////////////////////////////////////////////////////////////////////////////
//
//	Books Details
//
annotate my.Books with @(
	UI: {
  	HeaderInfo: {
  		TypeName: '{i18n>Book}',
  		TypeNamePlural: '{i18n>Books}',
  		Title: {Value: title},
  		Description: {Value: author.name}
  	},
	}
);



////////////////////////////////////////////////////////////////////////////
//
//	Books Elements
//
annotate my.Books with {
	ID @title:'{i18n>ID}' @UI.HiddenFilter;
	title @title:'{i18n>Title}';
	author @title:'{i18n>AuthorID}';
	price @title:'{i18n>Price}';
	stock @title:'{i18n>Stock}';
	descr @UI.MultiLineText;
}


////////////////////////////////////////////////////////////////////////////
//
//	Authors Elements
//
annotate my.Authors with {
	author_ID @title:'{i18n>ID}' @UI.HiddenFilter;
	name @title:'{i18n>AuthorName}';
}

annotate my.PriceList with {
	ID @UI.Hidden : true
};

annotate my.testBookView with @(UI: {
    Facets            : [{
        
        $Type : 'UI.ReferenceFacet',
        Label : 'test 12',
        ID    : 'test12',
        Target: '@UI.FieldGroup#test12',
    }, ],
    FieldGroup #test12: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataFieldForAction',
                Action: 'AdminService.addRating(AdminService.Books)',
                Label : 'test',
            },
            {
                $Type : 'UI.DataFieldForAction',
                Action: 'unBoundFunction',
                Label : 'test',
            },
            {
                $Type : 'UI.DataFieldForAction',
                Action: 'unBoundActionWithParam',
                Label : 'test',
            },
            {
                $Type : 'UI.DataFieldForAction',
                Action: 'getOrderStatus',
                Label : 'test',
            },
        ],

    }
});