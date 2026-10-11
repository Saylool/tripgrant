import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createApi, errorHandler } from "../server/app.js";
import { connection, walletAddresses, programId } from "../server/config.js";
import { hash } from "../server/chain.js";
import type { Server } from "node:http";

let server: Server;
let base: string;
before(async () => {
  assert.ok((await connection.getAccountInfo(programId))?.executable);
  const app = createApi();
  app.use(errorHandler);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as { port: number }).port;
  base = `http://127.0.0.1:${port}`;
});
after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
test("HTTP demo requires an explicit role and prevents cross-origin signing requests", async () => {
  assert.equal((await fetch(`${base}/api/snapshot`)).status, 401);
  assert.equal(
    (
      await fetch(`${base}/api/grants`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.invalid",
          "x-demo-role": "sponsor",
        },
        body: "{}",
      })
    ).status,
    403,
  );
});
test("grant snapshots expose only the requesting wallet’s grants", async () => {
  const response = await fetch(`${base}/api/snapshot`, {
    headers: { "x-demo-role": "student" },
  });
  assert.equal(response.status, 200);
  const data = (await response.json()) as any;
  assert.ok(data.grants.length > 0, "Run demo:seed first.");
  data.grants.forEach((g: any) =>
    assert.ok(
      [g.student, g.sponsor, g.reviewer].includes(walletAddresses.student),
    ),
  );
});
test("student uploads remain private and match the committed on-chain receipt", async () => {
  const data = (await (
    await fetch(`${base}/api/snapshot`, {
      headers: { "x-demo-role": "student" },
    })
  ).json()) as any;
  const funded = data.grants.find((g: any) => g.status === "funded");
  if (funded) {
    assert.equal(
      (
        await fetch(`${base}/api/grants/${funded.address}/sample-receipt`, {
          method: "POST",
          headers: {
            "x-demo-role": "reviewer",
            "content-type": "application/json",
          },
          body: "{}",
        })
      ).status,
      403,
    );
  }
  const submitted = data.grants.find(
    (g: any) => g.status === "submitted" && g.receiptAvailable,
  );
  assert.ok(submitted, "The seed includes a submitted synthetic expense.");
  const response = await fetch(
    `${base}/api/grants/${submitted.address}/receipt`,
    { headers: { "x-demo-role": "reviewer" } },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(
    response.headers.get("content-disposition") || "",
    /^attachment;/,
  );
  assert.equal(
    hash(new Uint8Array(await response.arrayBuffer())).toString("hex"),
    submitted.receiptHash,
  );
  assert.equal(
    (await fetch(`${base}/api/grants/${submitted.address}/receipt`)).status,
    401,
  );
});
test("settlement and amount validation reject a student trying to act as reviewer", async () => {
  const data = (await (
    await fetch(`${base}/api/snapshot`, {
      headers: { "x-demo-role": "student" },
    })
  ).json()) as any;
  const grant = data.grants.find((g: any) => g.status === "submitted");
  assert.ok(grant);
  const response = await fetch(`${base}/api/grants/${grant.address}/settle`, {
    method: "POST",
    headers: { "x-demo-role": "student", "content-type": "application/json" },
    body: JSON.stringify({ amount: "1" }),
  });
  assert.equal(response.status, 403);
});
