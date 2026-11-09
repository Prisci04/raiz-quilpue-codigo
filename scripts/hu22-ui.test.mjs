import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hu22Modules } from "./helpers/hu22-modules.mjs";

const hooks = await hu22Modules({
  "next/link": "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}",
  "next/navigation": "export function usePathname(){return '/'}",
});
test.after(() => hooks.deregister());
globalThis.fetch = async () => { throw new Error("SSR must not call chat API"); };
const { AssistantProvider } = await import("../src/components/ai/AssistantProvider.jsx");
const Page = (await import("../src/app/(sitio)/asistente/page.jsx")).default;
const Widget = (await import("../src/components/ai/AssistantWidget.jsx")).default;
test("HU22 full chat prerenders named log, labeled composer and safe loading state without browser APIs", () => {
  const html = renderToStaticMarkup(React.createElement(AssistantProvider, null, React.createElement(Page)));
  assert.match(html, /Conversemos sobre Quilpué/); assert.match(html, /role="log"/); assert.match(html, /Tu pregunta/);
  assert.match(html, /maxlength="1200"/i); assert.match(html, /disabled/); assert.match(html, /No compartas datos personales/);
  assert.doesNotMatch(html, /QWEN|API_KEY|NEXT_PUBLIC|instrucciones|dangerouslySetInnerHTML/);
});
test("HU22 collapsed public widget prerenders a keyboard accessible launcher with expanded state", () => {
  const html = renderToStaticMarkup(React.createElement(AssistantProvider, null, React.createElement(Widget)));
  assert.match(html, /aria-label="Abrir asistente"/); assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /role="dialog"/);
});
