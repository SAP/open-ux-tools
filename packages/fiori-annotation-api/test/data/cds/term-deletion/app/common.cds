using AdminService from '../srv/admin-service';

@Core.ConventionalIDs #Test_BeforeServiceExt: true
annotate AdminService with @Core.ConventionalIDs #Test_AfterServiceNameExt: true; 

@UI.TextArrangement #Test_BeforeEntityFirst: #TextLast
@UI: {TextArrangement #Test_BeforeEntityGroupSinglton: #TextLast}
@UI: {
    TextArrangement #Test_BeforeEntityGroupMiddle1: #TextLast,
    TextArrangement #Test_BeforeEntityGroupMiddle2: #TextLast
}
@UI.TextArrangement #Test_BeforeEntityLast: #TextLast
@UI.TextArrangement #Test_SandwichEntity1: #TextLast
annotate AdminService.Books with @(
    UI.TextArrangement #Test_SandwichEntity2: #TextLast,
    UI.TextArrangement #Test_OnEntityBegin: #TextLast,
    UI: {
        TextArrangement #Test_InVocGroupBegin: #TextLast,
        Identification: [{Value:title}],
        TextArrangement #Test_InVocGroupMiddle: #TextLast,
        TextArrangement #Test_InVocGroupMiddle2: #TextLast,
        SelectionFields: [ ID, author_ID, price, currency_code ],
        LineItem: [
            {Value: ID},
            {Value: title},
            {Value: author.name, Label:'{i18n>Author}'},
            {Value: stock},
            {Value: price},
            {Value: currency.symbol, Label:' '},
        ],
        TextArrangement #Test_InVocGroupEnd: #TextLast,
    },
    UI: {
        TextArrangement #Test_OnEntityMiddle: #TextLast,
        TextArrangement #Test_OnEntityMiddle2: #TextLast,
    },
    UI.TextArrangement #Test_OnEntityLast2: #TextLast,
    UI.TextArrangement #Test_OnEntityLast: #TextLast
) {
    @(Common.FieldControl #Test_BeforeElement : #Hidden)
    @Common.FieldControl #Test_SandwichElement1 : #Hidden 
    author 
    @Common.FieldControl #Test_SandwichElement2 : #Hidden 
    @Common.ValueList : {
        $Type:'Common.ValueListType',
        CollectionPath : author.name,
    }
    @(Common: {FieldControl #Test_AfterElement : #Hidden});
    
    // delete lonely annotation on element should remove the element as well
    title @Common.FieldControl #Test_Element2Lonely : #Hidden;

    // multiple annotations on element with leading @() - as generated for value help in page editor
    descr @(Common.ValueList #Test_PE_ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'SomePath',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : descr,
                ValueListProperty : 'SomeProp',
            },
        ],
    },
    Common.ValueListWithFixedValues: true
    );

    // multiple annotations before - embedded (i.e. createdAt will not be deleted)
    @Common.Text #Test_BeforeElementMultipleFirst: createdBy
    @Common.Text.@UI.TextArrangement #Test_BeforeElementMultipleLast : #TextLast
    createdAt
};

annotate AdminService.Books with {
    // multiple annotations before - standalone (i.e. deletion can include annotate statement)
    @Common.Text #Test_BeforeElementStandaloneMultipleFirst: createdBy
    @Common.Text.@UI.TextArrangement #Test_BeforeElementStandaloneMultipleLast : #TextLast
    createdAt
};

annotate AdminService.Books with {
    // multiple annotations sandwich - standalone (i.e. deletion can include property name and annotate statement)
    @Common.Text #Test_SandwichElementStandaloneFirst: createdBy
    createdAt @Common.Text.@UI.TextArrangement #Test_SandwichElementStandaloneLast : #TextLast
};

// combination followed by next anno statement without ';'
annotate AdminService.Books with 
    @UI: {TextArrangement #Test_BeforeEntityComb7: #TextLast}
    {
        descr @Common.FieldControl #Test_ElementComb7 : #Hidden
    }  
    actions {
	    addRating ( 
    	    stars @UI.ParameterDefaultValue #Test_ParamBoundComb7: false
        )
    }
annotate AdminService.Books with @UI.TextArrangement #Test_comb_without_semicolon: #TextLast;

// lonely annotation on target: on deletion of annotation, target is deleted as well
@UI.TextArrangement #Test_EntityBeforeLonely: #TextLast
annotate AdminService.Authors;

@Common : { Label #Test_Label : 'authors list', }
@Common.IsNaturalPerson #Test_Employee
annotate AdminService.Authors;

// with comments
@Common : { Label #Test_Label_With_Comments : 'authors list', }
// with comments
@Common.IsNaturalPerson #Test_Employee_With_Comments
annotate AdminService.Authors;

annotate AdminService.Books with {
    descr @Common.FieldControl #Test_Element3Lonely : #Hidden 
}

// comment belonging to next statement
@Common : { ChangedBy : 'tester', }
// do not remove annotate if annotations are applied on entity
annotate AdminService.Books with {
    descr @Common.FieldControl #Test_Entity_Annotated : #Hidden 
};

/* 
    block comments
*/
// multiline comments
// lonely annotation on target with comments
annotate AdminService.Authors with @UI.TextArrangement #Test_Entity3LonelyWithComment: #TextLast;

annotate AdminService.Authors with @UI.TextArrangement #Test_Entity2Lonely: #TextLast;

// lonely annotation on element but additional annotation for entity: on deletion of element annotation, annotate statement should stay
@title: 'foo'
annotate AdminService.Books with {
    descr @Common.FieldControl #Test_Element4WithEntityAnno : #Hidden 
};

// CDS native annotations should prevent the target from being deleted
annotate AdminService.Books with {
    @title: 'foo'
    descr @Common.FieldControl #Test_Element3Native : #Hidden 
};

// delete CDS native annotation
annotate AdminService.Books with {
    descr @title #Test_Element4Native: 'foo'
};

@title: 'foo'
annotate AdminService.Authors with @UI.TextArrangement #Test_Entity2Native: #TextLast;

// comments should be deleted when preceding an annotation that is deleted
annotate AdminService.Books with {
    // comment
    /*
    * author @Common.FieldControl : #Hidden // block comment
    */
    descr @Common.FieldControl #Test_Element3Comment : #Hidden 
};

annotate // some comment 
    AdminService.Books with { descr @Common.FieldControl #Test_Element4Comment : #Hidden
};

annotate AdminService.Books // some comment
    with { descr @Common.FieldControl #Test_Element5Comment : #Hidden
};

annotate AdminService.Books with // some comment
{ 
    descr @Common.FieldControl #Test_Element6Comment : #Hidden
};

annotate AdminService.Books with { // some comment
    descr @Common.FieldControl #Test_Element7Comment : #Hidden
};

annotate AdminService.Books with { 
    descr // some comment
    @Common.FieldControl #Test_Element8Comment : #Hidden
};


// comment
annotate AdminService.Authors with @UI.TextArrangement #Test_Entity2Comment: #TextLast;

// actions/functions (also varying case for keywords)
// UNBOUND
// Actions
Annotate AdminService.cancelOrder With @Common.IsActionCritical #Test_ActionWith1: false;      
ANNOTATE AdminService.cancelOrder WITH @(Common.IsActionCritical #Test_ActionWith2: false);
annoTATE AdminService.cancelOrder WIth @(Common: {IsActionCritical #Test_ActionWith3: false});

@Common.IsActionCritical #Test_ActionBefore: true 
annotate AdminService.cancelOrder;

// action parameters
annotate AdminService.cancelOrder with (
	orderID @UI.ParameterDefaultValue #Test_ParamAfter1: true,   // value help on true does not work if no value and no comma and not on last po
	@UI.ParameterDefaultValue #Test_ParamBefore1: true reason,  // value help on true does not work when no value is there
);
annotate AdminService.cancelOrder with (
	orderID @(UI.ParameterDefaultValue #Test_ParamAfter2: true),
	@UI: {ParameterDefaultValue #Test_ParamBefore2: false} reason,
);

// BOUND 
// Actions
annotate AdminService.Books with actions {
	addRating @Common.IsActionCritical #Test_ActionBoundAfter: true;
};
annotate AdminService.Books with ACTIONS {
	@Common.IsActionCritical #Test_ActionBoundBefore: true addRating;
};

// action parameters
annotate AdminService.Books with Actions {
	addRating ( 
    	stars @UI.ParameterDefaultValue #Test_ParamBoundAfter: false
  )
};
annotate AdminService.Books with actIONS {
	addRating ( 
    	@UI.ParameterDefaultValue #Test_ParamBoundBefore: 'myDef' stars  
    )
};

// functions
annotate AdminService.Books with actions {
	getViewsCount @Common.IsActionCritical #Test_FunctionBoundAfter: true;
};

annotate AdminService.Books with actions {
    @Common.IsActionCritical #Test_FunctionBoundBefore: true getViewsCount;
};

// combinations
// action parameter
@title #comb1: 'foo'
annotate AdminService.cancelOrder with (
	orderID @(UI.ParameterDefaultValue #Test_CombParam1: true)
);
annotate AdminService.cancelOrder with @title #comb2: 'foo' (
	orderID @(UI.ParameterDefaultValue #Test_CombParam2: true)
);
// bound action
@title #comb1: 'foo'
annotate AdminService.Books with actions {
	addRating @Common.IsActionCritical #Test_CombActionBound1: true;
};
annotate AdminService.Books with @title #comb2: 'foo' actions {
	addRating @Common.IsActionCritical #Test_CombActionBound2: true;
};
annotate AdminService.Books with {
    author @title #comb2: 'foo'
} actions {
	addRating @Common.IsActionCritical #Test_CombActionBound3: true;
};
annotate AdminService.Books with actions {
	addRating @Common.IsActionCritical #Test_CombActionBound4: true (
        stars @UI.ParameterDefaultValue #comb2 : true
    );
};
annotate AdminService.Books with actions {
	@(Common.IsActionCritical #Test_CombActionBound5: true) addRating (
        stars @UI.ParameterDefaultValue #comb3 : true
    );
};
// bound action parameter
@title #comb5: 'foo'
annotate AdminService.Books with actions {
	addRating ( 
    	stars @UI.ParameterDefaultValue #Test_CombParamBound1: false
  )
};
annotate AdminService.Books with @title #comb6: 'foo' actions {
	addRating ( 
    	stars @UI.ParameterDefaultValue #Test_CombParamBound2: false
  )
};
annotate AdminService.Books with {
    author @title #comb3: 'foo'
} actions {
	addRating ( 
    	stars @UI.ParameterDefaultValue #Test_CombParamBound3: false
  )
};
annotate AdminService.Books with actions {
	@title #comb6: 'foo' addRating ( 
    	stars @UI.ParameterDefaultValue #Test_CombParamBound4: false
  )
};
annotate AdminService.Books with actions {
	addRating @title #comb7: 'foo' ( 
    	stars @UI.ParameterDefaultValue #Test_CombParamBound5: false
  )
};

// combination of entity annotation with single annotation of single element (don't remove trailing ';'!)
annotate AdminService.Books with 
  @UI.TextArrangement #Test_EntityElementCombinedEnt: #TextLast {
  author @title #Test_EntityElementCombinedElem: 'foo'
};
