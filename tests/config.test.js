import test from "node:test";
import assert from "node:assert/strict";
import {normalizeLanguage,splitText} from "../src/config.js";
test("accepts language codes",()=>{assert.equal(normalizeLanguage("vi"),"vi");assert.equal(normalizeLanguage("en-US"),"en-us");});
test("rejects invalid language codes",()=>{assert.equal(normalizeLanguage("hello world"),null);assert.equal(normalizeLanguage(""),null);});
test("splits long text without losing content",()=>{
  const chunks=splitText("abc def ghi jkl",5);
  assert.ok(chunks.every(chunk=>chunk.length<=5));
  assert.equal(chunks.join(" ").replace(/\s+/g," ").trim(),"abc def ghi jkl");
});
