// tests\size-order.test.ts

import assert from "node:assert/strict";
import test from "node:test";

import { sortSizes, SIZE_OPTIONS_US } from "../src/utils/sizeOrder";

test("sortSizes follows a logical US size order", () => {
  assert.deepEqual(sortSizes(["2XL", "3XL", "L", "M", "S", "XL"]), [
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
  ]);

  assert.deepEqual(sortSizes(["XXL", "XS", "XL", "L", "M", "S"]), [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ]);
});

test("SIZE_OPTIONS_US starts from smallest to largest", () => {
  assert.deepEqual(SIZE_OPTIONS_US.slice(0, 6), [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
  ]);
});
