using MainService from './service';

annotate MainService.Capex with {
	ID	@title: 'ID';
	requestid	@title: 'Request Id';
	title	@title: 'Title';
	firstname	@title: 'First Name';
	lastname	@title: 'Last Name';
	email	@title: 'Email';
	userid	@title: 'User Id';
	comments	@title: 'Comments';
	totalcost	@title: 'Total Cost';
	type	@title: 'Type';
	capex	@title: 'CAPEX';
	opex	@title: 'OPEX';
	currency	@title: 'Currency';
	roi	@title: 'ROI';
	irr	@title: 'IRR';
	country	@title: 'Country';
	business_unit	@title: 'Business Unit';
	description	@title: 'Description';
	energy_efficiency	@title: 'Energy Efficiency';
	co2_efficiency	@title: 'CO2 Efficiency';
	energy_cost_savings	@title: 'Energy Cost Savings';
	water_savings	@title: 'Water Savings';
};

annotate MainService.Capex with {
	business_unit @UI.Hidden
};

annotate MainService.Capex with {
	currency @UI.Hidden: true
};

// test collision of generated field group qualifiers
annotate MainService.Capex with @UI: {
	FieldGroup #GeneratedGroup : {
        Data : [
            {
                Value : requestid,
            }
		]
	}
};
