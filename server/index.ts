import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { createApi, errorHandler } from "./app.js";
import { port, host, demo, network } from "./config.js";

const app = createApi();
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Unknown API route." }),
);
const httpServer = createServer(app);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.resolve("dist/index.html")),
  );
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true, ws: { server: httpServer } },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.get("/{*path}", async (req, res, next) => {
    try {
      const html = await readFile("app/index.html", "utf8");
      res
        .status(200)
        .set("Content-Type", "text/html")
        .end(await vite.transformIndexHtml(req.originalUrl, html));
    } catch (e) {
      next(e);
    }
  });
}
app.use(errorHandler);
httpServer.listen(port, host, () =>
  console.log(
    `TripGrant ready at http://127.0.0.1:${port} (${demo ? "disposable demo wallets" : "wallet signing"}, ${network})`,
  ),
);
