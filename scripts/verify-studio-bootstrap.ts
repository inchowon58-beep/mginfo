import assert from "node:assert/strict";
import { parseNaverVerification, resolveNaverVerification } from "../src/lib/seo";

const sample = '<meta name="naver-site-verification" content="abc12345tokenxx" />';
assert.equal(parseNaverVerification(sample), "abc12345tokenxx");
assert.equal(parseNaverVerification("abc12345tokenxx"), "abc12345tokenxx");

process.env.SITE_NAME = "clone";
process.env.SITE_DOMAIN = "clone.example.co.kr";
delete process.env.NAVER_SITE_VERIFICATION;
assert.equal(resolveNaverVerification(""), "", "clone must not inherit hub naver meta");

process.env.NAVER_SITE_VERIFICATION = "envtoken123456";
assert.equal(resolveNaverVerification(""), "envtoken123456");

delete process.env.SITE_NAME;
delete process.env.SITE_DOMAIN;
delete process.env.NAVER_SITE_VERIFICATION;
assert.equal(resolveNaverVerification(""), "e9b6a1cf71d8146bc16b900775c17176cd622fc5", "hub keeps default");

console.log("verify-studio-bootstrap: ok");
