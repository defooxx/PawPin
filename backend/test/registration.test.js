import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanEmail,
  createOneTimeToken,
  hashOneTimeToken,
  validPassword,
  validRegistrationConsent,
} from "../src/registration.js";

test("normalizes email addresses", () => {
  assert.equal(cleanEmail("  Person@Example.COM "), "person@example.com");
});

test("requires a strong enough password", () => {
  assert.equal(validPassword("short1"), false);
  assert.equal(validPassword("longbutnonumber"), false);
  assert.equal(validPassword("secure-pass-123"), true);
});

test("hashes unpredictable one-time tokens", () => {
  const token = createOneTimeToken();
  assert.equal(token.length, 64);
  assert.equal(hashOneTimeToken(token).length, 64);
  assert.notEqual(hashOneTimeToken(token), token);
});

test("requires explicit registration consent", () => {
  assert.equal(validRegistrationConsent({ acceptTerms: true, acceptPrivacy: true, locationConsent: "ask" }), true);
  assert.equal(validRegistrationConsent({ acceptTerms: true, acceptPrivacy: false, locationConsent: "ask" }), false);
  assert.equal(validRegistrationConsent({ acceptTerms: true, acceptPrivacy: true, locationConsent: "always" }), false);
});
