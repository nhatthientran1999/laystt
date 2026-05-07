import handler from "./server.js";

export const config = {
  runtime: "nodejs",
};

export default async (req, res) => {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["host"];
    const url = new URL(req.url || "/", `${protocol}://${host}`);

    // Chuyển đổi headers Node.js sang Web Standard Headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers: headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
      // @ts-ignore
      duplex: "half",
    });

    const response = await handler.fetch(request);

    // Gửi headers phản hồi
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Gửi body phản hồi
    const body = await response.arrayBuffer();
    res.send(Buffer.from(body));
  } catch (err) {
    console.error("Vercel Bridge Error:", err);
    res.status(500).end(`Internal Server Error: ${err.message}`);
  }
};
