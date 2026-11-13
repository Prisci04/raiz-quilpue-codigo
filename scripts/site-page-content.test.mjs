import assert from "node:assert/strict";
import test from "node:test";

import {
  SITE_PAGE_DEFAULTS,
  SITE_PAGE_FIELDS,
} from "../src/lib/site-page-content.mjs";

test("los campos editables cubren los valores de Inicio y Quiénes somos", () => {
  for (const [pageKey, defaults] of Object.entries(SITE_PAGE_DEFAULTS)) {
    const editableKeys = SITE_PAGE_FIELDS[pageKey].flatMap((section) =>
      section.fields.map((field) => field.key),
    );
    assert.deepEqual([...editableKeys].sort(), Object.keys(defaults).sort());
  }
});

test("los borradores iniciales de ambas páginas contienen texto no vacío", () => {
  for (const page of Object.values(SITE_PAGE_DEFAULTS)) {
    for (const value of Object.values(page)) {
      assert.equal(typeof value, "string");
      assert.ok(value.trim().length > 0);
    }
  }
});
