// const cds = require("@sap/cds");

// module.exports = cds.service.impl(async function (srv) {
//     const {
//         SafetyIncidents,
//         BusinessPartner,
//         Individual,
//         BusinessPartnerAddress
//     } = srv.entities

//     const extSrv = await cds.connect.to("API_BUSINESS_PARTNER")

//     this.on('READ', BusinessPartner, req =>
//         !req.query.cqn.where || (req.query.cqn.where && req.query.cqn.where[0] != "exists") ? extSrv.tx(req).run(req.query) : console.log('skipped')
//     )

//     this.on('READ', BusinessPartnerAddress, req =>
//         !req.query.cqn.where || (req.query.cqn.where && req.query.cqn.where[0] != "exists") ? extSrv.tx(req).run(req.query) : console.log('skipped')
//     )

//     this.after('READ', SafetyIncidents, async (response, context) => {
//         return Promise.all(
//             //check on expanded entities in query response
//             response.filter(response => response.assignedIndividual && (response.assignedIndividual.businessPartner || response.assignedIndividual.businessPartnerAddress))
//             .map(each =>
//                 //asynchronous parallel read from S/4 service for expand on businessPartner and businessPartnerAddress
//                 Promise.all([
//                     getBusinessPartner(each.assignedIndividual.businessPartner, context),
//                     getBusinessPartnerAddress(each.assignedIndividual.businessPartnerAddress, context)
//                 ])
//             )
//         )
//     })

//     this.after('READ', Individual, async (response, context) => {
//         return Promise.all(
//             //check on expanded entities in query response
//             response.filter(response => response.businessPartner || response.businessPartnerAddress)
//             .map(each =>
//                 //asynchronous parallel read from S/4 service for expand on businessPartner and businessPartnerAddress
//                 Promise.all([
//                     getBusinessPartner(each.businessPartner, context),
//                     getBusinessPartnerAddress(each.businessPartnerAddress, context)
//                 ])
//             )
//         )
//     })

//     this.after('READ', BusinessPartner, async (response, context) => {
//         if (context.query.cqn.where && context.query.cqn.where[0] === "exists") {
//             return Promise.all(
//                 response.map(each =>
//                     Promise.all([
//                         getBusinessPartner(each, context)
//                     ])
//                 )
//             )
//         }
//     })

//     this.after('READ', BusinessPartnerAddress, async (response, context) => {
//         if (context.query.cqn.where && context.query.cqn.where[0] === "exists") {
//             return Promise.all(
//                 response.map(each =>
//                     Promise.all([
//                         getBusinessPartnerAddress(each, context)
//                     ])
//                 )
//             )
//         }
//     })

//     const getBusinessPartner = async (each, context) => {
//         if (!extSrv.options.mocked && each) {
//             await extSrv.tx(context).run(
//                 SELECT.one.from(BusinessPartner).where({
//                     BusinessPartner: each.BusinessPartner
//                 })
//             ).then(data =>
//                 Object.assign(each, data)
//             )
//         }
//     }

//     const getBusinessPartnerAddress = async (each, context) => {
//         if (!extSrv.options.mocked && each) {
//             await extSrv.tx(context).run(
//                 SELECT.one.from(BusinessPartnerAddress).where({
//                     BusinessPartner: each.BusinessPartner
//                 }).and({
//                     AddressID: each.AddressID
//                 })
//             ).then(data =>
//                 Object.assign(each, data)
//             )
//         }
//     }
// })
