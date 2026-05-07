import handler from "../dist/server/server.js";

export const config = {
  runtime: "edge",
};

export default async (request) => {
  return handler.fetch(request);
};
