// tests/auth-social.test.ts — config OAuth (aucun bouton leurre).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SOCIAL_PROVIDERS,
  OAUTH_LIVE,
  isOAuthLive,
  socialLabel,
} from "../src/components/AuthSocial.tsx";

test("config : 3 providers, Google seul en live", () => {
  assert.deepEqual(
    SOCIAL_PROVIDERS.map((p) => p.id),
    ["google", "apple", "facebook"],
  );
  assert.deepEqual(OAUTH_LIVE, ["google"]);
  assert.equal(isOAuthLive("google"), true);
  assert.equal(isOAuthLive("apple"), false);
  assert.equal(isOAuthLive("facebook"), false);
});

test("labels : (soon) suffixé quand désactivé, jamais l'inverse", () => {
  assert.equal(socialLabel({ id: "google", label: "Continue with Google" }), "Continue with Google");
  assert.equal(
    socialLabel({ id: "apple", label: "Continue with Apple" }),
    "Continue with Apple (soon)",
  );
  assert.equal(
    socialLabel({ id: "facebook", label: "Continue with Facebook" }),
    "Continue with Facebook (soon)",
  );
});
