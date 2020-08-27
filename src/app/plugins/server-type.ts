export const serverType = {
	name: "server-type",
	version: "0.1.0",
	register(server, options) {
		server.ext({
			type: "onPreResponse",
			method: (request, h) => {
				const response = request.response.isBoom ? request.response.output : request.response;
				response.headers["X-Server-Type"] = "MultiSignature";

				return h.continue;
			},
		});
	},
};
