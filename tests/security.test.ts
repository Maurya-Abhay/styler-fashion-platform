import test from "node:test";
import assert from "node:assert/strict";
import { httpUrlSchema } from "../src/lib/validation";
import { verifyPassword, burnPasswordCheck } from "../src/lib/password";

test("image URL schema rejects non-http(s) schemes", () => {
  assert.equal(httpUrlSchema.safeParse("https://ik.imagekit.io/x/a.jpg").success, true);
  assert.equal(httpUrlSchema.safeParse("javascript:alert(1)").success, false);
  assert.equal(httpUrlSchema.safeParse("data:text/html,<script>1</script>").success, false);
  assert.equal(httpUrlSchema.safeParse("file:///etc/passwd").success, false);
});

test("password helpers never throw on bad input", async () => {
  assert.equal(await verifyPassword("x", ""), false);
  assert.equal(await verifyPassword("x", "not-a-hash"), false);
  await burnPasswordCheck("anything");
});
