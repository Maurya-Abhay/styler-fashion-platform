import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedPushEndpoint } from "../src/lib/web-push";

test("push endpoints are limited to real browser push services", () => {
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
  assert.equal(isAllowedPushEndpoint("https://web.push.apple.com/abc"), true);
  assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"), false);
  assert.equal(isAllowedPushEndpoint("https://169.254.169.254/latest/meta-data"), false);
  assert.equal(isAllowedPushEndpoint("https://localhost/x"), false);
  assert.equal(isAllowedPushEndpoint("https://evil.example.com/fcm.googleapis.com"), false);
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.com/x"), false);
  assert.equal(isAllowedPushEndpoint("https://user:pw@fcm.googleapis.com/x"), false);
});
