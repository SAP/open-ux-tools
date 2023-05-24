import Filter from 'sap/ui/model/Filter';
import FilterOperator from 'sap/ui/model/FilterOperator';

/**
 * Custom filter
 * @param sValue selected filter item
 * @returns new Filter
 */
export function <%- eventHandlerFnName %>(value: string) {
    switch (value) {
        case "0":
            return new Filter({ path: "<%- property %>", operator: FilterOperator.LT, value1: 100 });
        case "1":
            return new Filter({
                filters: [
                    new Filter({ path: "<%- property %>", operator: FilterOperator.GT, value1: 100 }),
                    new Filter({ path: "<%- property %>", operator: FilterOperator.LT, value1: 500 })
                ],
                and: true
            });
        case "2":
            return new Filter({ path: "<%- property %>", operator: FilterOperator.GT, value1: 500 });
    }
}