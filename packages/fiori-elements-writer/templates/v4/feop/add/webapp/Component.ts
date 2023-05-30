import AppComponent from "<%- app.baseComponent %>";

/**
 * @namespace <%- app.id %>
 */
export default class Component extends AppComponent {

	public static metadata = {
		manifest: "json"
	};

	/**
	 * Gets the component startup parameters, setting preferredMode to 'create'.
	 *
	 * @returns startup parameters containing preferredMode set to 'create'
	 */
	public getStartupParameters(): Promise<object> {
		return Promise.resolve({
			preferredMode: ["create"]
		});
	}
}