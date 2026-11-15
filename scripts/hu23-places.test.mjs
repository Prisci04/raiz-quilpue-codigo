import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeGeocodingQuery, parseGeocodingResults } from "../src/lib/maps/openstreetmap.mjs";

const root=fileURLToPath(new URL("../",import.meta.url));
const auth=globalThis.__hu23GeocodingAuth={denied:false};
globalThis.fetch=async()=>{throw Error("External network disabled");};
const hooks=registerHooks({
 resolve(name,context,next){
  if(name==="server-only")return {url:"hu23-geo:server",shortCircuit:true};
  if(name==="@/lib/auth/guard")return {url:"hu23-geo:auth",shortCircuit:true};
  if(name.startsWith("@/")){const base=resolve(root,"src",name.slice(2));return {url:pathToFileURL([base,base+".js",base+".mjs"].find(existsSync)).href,shortCircuit:true};}
  return next(name,context);
 },
 load(url,context,next){
  if(url==="hu23-geo:server")return {format:"module",source:"export {};",shortCircuit:true};
  if(url==="hu23-geo:auth")return {format:"module",shortCircuit:true,source:"export async function requireGestorContenido(){return {response:globalThis.__hu23GeocodingAuth.denied?Response.json({success:false},{status:403}):null,user:{id:1}};}"};
  return next(url,context);
 }
});
const {createNominatimGeocoder}=await import("../src/services/openstreetmap-geocoding.service.js");
const route=await import("../src/app/api/admin/actividades/ubicacion/route.js");
const row={lat:"-33.05",lon:"-71.45",display_name:"Recinto, Quilpué",extratags:{ignored:true}};
test("manual query normalization and minimal bounded results",()=>{
 assert.equal(normalizeGeocodingQuery("  Calle   1  "),"Calle 1");
 for(const q of ["","  ","ab","x".repeat(301),null,{}])assert.equal(normalizeGeocodingQuery(q),null);
 assert.deepEqual(parseGeocodingResults([row,row,{lat:"",lon:"0",display_name:"Invalid"},{lat:"91",lon:"0",display_name:"Bad"}]),[{id:"-33.05,-71.45",label:row.display_name,latitud:-33.05,longitud:-71.45}]);
 assert.equal(parseGeocodingResults(Array.from({length:10},(_,i)=>({...row,lat:String(i)}))).length,5);
 assert.throws(()=>parseGeocodingResults({}));
});
test("a deliberate search requests once with identification, soft bias and caches repeats",async()=>{
 let clock=0,calls=0;
 const search=createNominatimGeocoder({now:()=>clock,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url.origin,"https://nominatim.openstreetmap.org");assert.equal(url.searchParams.get("limit"),"5");
  assert.equal(url.searchParams.get("bounded"),"0");assert.equal(url.searchParams.has("countrycodes"),false);
  assert.match(options.headers["User-Agent"],/RaizQuilpue/);return Response.json([row]);
 }});
 assert.equal(calls,0);
 await search("  Quilpué ");await search("QUILPUÉ");assert.equal(calls,1);
 await assert.rejects(search("Valparaíso"),e=>e.status===429);
 clock=1100;await search("Valparaíso");assert.equal(calls,2);
 clock=16*60*1000;await search("Quilpué");assert.equal(calls,3);
});
test("one active request globally per service; no automatic loops or retries",async()=>{
 let finish,calls=0,clock=0;
 const search=createNominatimGeocoder({now:()=>clock,fetchImpl:()=>{calls++;return new Promise(done=>{finish=done;});}});
 const first=search("Quilpué");clock=5000;
 await assert.rejects(search("Santiago"),e=>e.status===429);assert.equal(calls,1);
 finish(Response.json([]));assert.deepEqual(await first,[]);
});
test("empty/malformed queries never fetch; empty results, invalid JSON and external errors are controlled",async()=>{
 let calls=0;
 const search=createNominatimGeocoder({fetchImpl:async()=>{calls++;return Response.json([]);}});
 await assert.rejects(search(""));assert.equal(calls,0);assert.deepEqual(await search("Sin resultados"),[]);
 for(const result of [new Response("invalid"),Response.json({bad:true}),new Response("",{status:503}),new Response("",{status:429})]){
  const failed=createNominatimGeocoder({fetchImpl:async()=>result});
  await assert.rejects(failed("Quilpué"),e=>[429,502].includes(e.status));
 }
});
test("abort, pre-abort and timeout clean up the active request",async(t)=>{
 t.mock.timers.enable({apis:["setTimeout"]});
 const controller=new AbortController();let calls=0;
 const search=createNominatimGeocoder({fetchImpl:async(_url,{signal})=>{calls++;return new Promise((_done,reject)=>signal.addEventListener("abort",()=>reject(new DOMException("Stopped","AbortError")),{once:true}));}});
 const first=search("Quilpué",{signal:controller.signal});controller.abort();
 await assert.rejects(first,e=>e.name==="AbortError");
 await assert.rejects(search("Quilpué",{signal:controller.signal}),e=>e.name==="AbortError");assert.equal(calls,1);
 const timed=createNominatimGeocoder({fetchImpl:async(_url,{signal})=>new Promise((_done,reject)=>signal.addEventListener("abort",()=>reject(Error("Timeout")),{once:true}))});
 const pending=timed("Santiago");t.mock.timers.tick(10000);await assert.rejects(pending,e=>e.status===504);
 t.mock.timers.reset();
});
test("distributed deployment fails closed for public Nominatim; a configured gateway is replaceable",async()=>{
 let calls=0;
 const publicSearch=createNominatimGeocoder({distributed:true,fetchImpl:async()=>{calls++;return Response.json([]);}});
 await assert.rejects(publicSearch("Quilpué"),e=>e.status===503);assert.equal(calls,0);
 const custom=createNominatimGeocoder({distributed:true,searchUrl:"https://geocoder.example.test/search",fetchImpl:async()=>{calls++;return Response.json([]);}});
 assert.deepEqual(await custom("Quilpué"),[]);assert.equal(calls,1);
});
test("the administrative endpoint denies before body/provider access and validates explicit POST queries",async()=>{
 auth.denied=true;let reads=0;
 const denied=await route.POST({text(){reads++;throw Error("Unexpected body");}});
 assert.equal(denied.status,403);assert.equal(reads,0);
 auth.denied=false;
 for(const query of [undefined,"",12]){
  const response=await route.POST(new Request("http://localhost/api/admin/actividades/ubicacion",{method:"POST",body:JSON.stringify({query})}));
  assert.equal(response.status,400);
 }
});
test.after(()=>hooks.deregister());
