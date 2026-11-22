import test from "node:test";
import assert from "node:assert/strict";
import { languageCode, splitText } from "../worker/utils.js";
test("normalizes language tags", () => {
  assert.equal(languageCode("VI"), "vi");
  assert.equal(languageCode("en-US"), "en-us");
  assert.equal(languageCode("bad value"), "vi");
});
test("splits text within Telegram limit and preserves content", () => {
  const input = "one two three four five six";
  const parts = splitText(input, 8);
  assert.ok(parts.every((part) => part.length <= 8));
  assert.equal(parts.join(" "), input);
});
