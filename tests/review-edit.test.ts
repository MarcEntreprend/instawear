// tests/review-edit.test.ts — validation + propriété (édition d'avis).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateReview,
  isOwnReview,
} from "../src/components/product/EditReviewModal.tsx";

test("validateReview : miroir des règles du dépôt", () => {
  assert.equal(
    validateReview({ rating: 0, title: "", body: "" }),
    "Please select a rating.",
  );
  assert.equal(
    validateReview({ rating: 6, title: "x", body: "" }),
    "Please select a rating.",
  );
  assert.equal(
    validateReview({ rating: 5, title: "", body: "" }),
    "Write a title or a review.",
  );
  assert.equal(
    validateReview({ rating: 4, title: "", body: "ab" }),
    "Review is too short.",
  );
  assert.equal(
    validateReview({ rating: 5, title: "Top", body: "" }),
    null,
  );
  assert.equal(
    validateReview({ rating: 3, title: "", body: "Great quality!" }),
    null,
  );
});

test("isOwnReview : jamais d'ID forgé, deux formes d'ID", () => {
  assert.equal(isOwnReview({ customerId: "u1" }, "u1"), true);
  assert.equal(isOwnReview({ customer_id: "u1" }, "u1"), true);
  assert.equal(isOwnReview({ customerId: "u2" }, "u1"), false);
  assert.equal(isOwnReview({ customerId: "u1" }, null), false);
  assert.equal(isOwnReview(null, "u1"), false);
});
