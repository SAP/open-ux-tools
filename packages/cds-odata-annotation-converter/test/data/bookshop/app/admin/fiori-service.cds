using AdminService from '../../srv/admin-service';

////////////////////////////////////////////////////////////////////////////
//
//	Books Object Page
//
annotate AdminService.Books with @(
	UI: {
		Facets: [
			{$Type: 'UI.ReferenceFacet', Label: '{i18n>General}', Target: '@UI.FieldGroup#General'},
			{$Type: 'UI.ReferenceFacet', Label: '{i18n>Details}', Target: '@UI.FieldGroup#Details'},
			{$Type: 'UI.ReferenceFacet', Label: '{i18n>Admin}', Target: '@UI.FieldGroup#Admin'},
		],
		FieldGroup#General: {
			Data: [
				{Value: Title}, {Value: title}, {Value: TITLE},
				{Value: author_AUTHOR_ID},
				{Value: DEscr},
			]
		},
		FieldGroup#Details: {
			Data: [
				{Value: stock},
				{Value: price},
				{Value: currency_code, Label: '{i18n>Currency}'},
			]
		},
		FieldGroup#Admin: {
			Data: [
				{Value: createdBy},
				{Value: createdAt},
				{Value: modifiedBy},
				{Value: modifiedAt}
			]
		}
	}
);

////////////////////////////////////////////////////////////////////////////
//
//	Test annotating actions/functions
//
annotate AdminService.Books with actions {
	@(cds.odata.bindingparameter.name : '_it2',
	Common.SideEffects.TargetProperties: ['_it2/author_ID', '_it2/author_author_ID'],
	Common.SideEffects: {
        TargetEntities: [_IT2.Author]  
    })
	addRating @Common.IsActionCritical #actionAfter: true ( 
    	stars @UI.ParameterDefaultValue #paramAfter: false
  	)
};

annotate AdminService.getOrderStatus with @Common.IsActionCritical #actionWith: false (
	orderID @UI.ParameterDefaultValue #paramAfter: false
);

////////////////////////////////////////////////////////////////////////////
//
//	Test 'Action' string value (collect metadata for diagnostics!) and NavigationPropertyPath 
//
annotate AdminService.Books with @(
	UI.Identification : [
		{
			$Type : 'UI.DataFieldForAction', Action : 'AdminService.copy'
		}, {
			$Type : 'UI.DataFieldForAction', Action : 'AdminService.EntityContainer/getOrderStatus'
		}, {
			$Type : 'UI.DataFieldWithNavigationPath', Target : author, Value : author_author_ID 
		}, { 
			$Type : 'UI.DataFieldForAction', Action : 'AdminService.copyOrder' // bound, but not to anno target
		}
	]
);

////////////////////////////////////////////////////////////////////////////
//
//	Test usage of '$Return' as PropertyPath
//
annotate AdminService.getOrderStatus with @Capabilities.ChangeTracking : {
	$Type : 'Capabilities.ChangeTrackingType',
	FilterableProperties : [
		$RETURN
	]
};

////////////////////////////////////////////////////////////////////////////
//
//	Test usage of member of complex property via generated field
//
annotate AdminService.Orders with {
	currency @UI.Hidden: pricing_Terms_my_grossAmountIndicator
};

////////////////////////////////////////////////////////////////////////////
//
//	Test usage of Common.ValueList properties diagnostics
//
annotate AdminService.Orders with {
	currency @(Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Currencies',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : currency_code,
                    ValueListProperty : 'code',
                },
            ],
        },
        Common.ValueListWithFixedValues : true
	)		
};

//	Test annotation on added projection view column
//
extend projection AdminService.Orders with {
  virtual null as someVirtualField: Boolean @UI.Hidden,
};

