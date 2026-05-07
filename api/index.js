import handler from "../dist/server/server.js";

export const config = {
  runtime: "nodejs",
};

export default async (req, res) => {
  // Chuyển đổi request từ Vercel (Node.js) sang Web Standard Request
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"];
  const url = new URL(req.url, `${protocol}://${host}`);

  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
    // @ts-ignore
    duplex: "half",
  });

  const response = await handler.fetch(request);

  // Chuyển đổi Web Standard Response ngược lại Vercel (Node.js)
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.arrayBuffer();
  res.send(Buffer.from(body));
};
