import assert from "node:assert/strict";
import test from "node:test";
import { parseActividadUbicacion, coordinatePatch, coordenadasValidas, buildActividadMapsLinks, puedeMostrarMapa } from "../src/lib/actividad-ubicacion.mjs";
import { parseActividadInput } from "../src/lib/community-validation.mjs";

const catalogs={modalidad:[{id:1,nombre:"Presencial"},{id:2,nombre:"Virtual"},{id:3,nombre:"Híbrida"}],
  publico_objetivo:[{id:1,nombre:"Todas las edades"}],lugares:[{id:10,nombre:"Centro cultural"}],estado_publicacion:[{id:1,nombre:"Borrador"}]};
const base = { titulo: "Actividad", descripcion: "Descripción", fecha:"2099-01-01",id_modalidad:1,id_publico:1,id_lugar:10,id_estado:1 };
test("location: omission, editorial text and legacy reference retain their semantics", () => {
  assert.deepEqual(parseActividadUbicacion({}).value, {});
  assert.deepEqual(parseActividadUbicacion({ direccion: null, google_place_id: " " }).value, { direccion: null, google_place_id: null });
  assert.deepEqual(parseActividadUbicacion({ direccion: " Calle propia ", google_place_id: "legacy" }).value, { direccion: "Calle propia", google_place_id: "legacy" });
  for (const input of [null, [], { direccion: 123 }, { direccion: "a".repeat(501) }, { google_place_id: "a\u0000b" }]) assert.equal(parseActividadUbicacion(input).ok, false);
});
test("coordinates accept finite numeric ranges, null pairs and zero without coercion", () => {
  for (const [latitud,longitud] of [[0,0],[-90,-180],[90,180],[-33.05,-71.45]]) {
    assert.equal(coordenadasValidas(latitud,longitud), true);
    assert.deepEqual(parseActividadUbicacion({latitud,longitud}).value,{latitud,longitud});
  }
  assert.deepEqual(parseActividadUbicacion({latitud:null,longitud:null}).value,{latitud:null,longitud:null});
  for (const [latitud,longitud] of [[91,0],[0,181],[-91,0],[0,-181],[NaN,0],[Infinity,0],["1",2],[true,0],[null,1],[undefined,2]]) assert.equal(parseActividadUbicacion({latitud,longitud}).ok,false);
  assert.deepEqual(coordinatePatch({latitud:null}),{latitud:null,longitud:null});
  assert.deepEqual(coordinatePatch({longitud:null}),{latitud:null,longitud:null});
  assert.deepEqual(coordinatePatch({latitud:2}),{latitud:2});
});
test("presencial/hibrida use coordinates; virtual and unknown never expose physical maps or links", () => {
  for(const modalidad of ["presencial","hibrida","Presencial","Híbrida"]) {
    const value={modalidad,latitud:-33,longitud:-71};
    assert.equal(puedeMostrarMapa(value),true);assert.ok(buildActividadMapsLinks(value).map);
  }
  for(const modalidad of ["virtual",null,""]) {
    const value={modalidad,direccion:"Histórica",latitud:-33,longitud:-71,google_place_id:"legacy"};
    assert.equal(puedeMostrarMapa(value),false);
    assert.deepEqual(buildActividadMapsLinks(value),{directions:null,map:null});
  }
  assert.equal(parseActividadInput({...base,id_lugar:null},catalogs).ok,false);
  for(const id_modalidad of [1,3,2]) assert.equal(parseActividadInput({...base,id_modalidad,latitud:0,longitud:0},catalogs).ok,true);
});
test("Google is external navigation only: coordinates win, text is safely encoded, no key or legacy ID required", () => {
  const activity={modalidad:"presencial",direccion:"A & B #12, Quilpué",google_place_id:"legacy",latitud:-33.05,longitud:-71.45};
  const links=buildActividadMapsLinks(activity);
  assert.notEqual(links.directions, links.map);
  assert.equal(new URL(links.directions).pathname, "/maps/dir/");
  assert.equal(new URL(links.map).pathname, "/maps/search/");
  assert.equal(new URL(links.directions).searchParams.get("destination"),"-33.05,-71.45");
  assert.equal(new URL(links.map).searchParams.get("query"),"-33.05,-71.45");
  for(const link of Object.values(links)){
    const url=new URL(link);assert.equal(url.origin,"https://www.google.com");assert.equal(url.searchParams.get("api"),"1");
    assert.equal(url.searchParams.has("key"),false);assert.equal(link.includes("legacy"),false);
  }
  const text=buildActividadMapsLinks({...activity,latitud:null,longitud:null});
  assert.equal(new URL(text.directions).pathname, "/maps/dir/");
  assert.equal(new URL(text.directions).searchParams.get("destination"), activity.direccion);
  assert.equal(new URL(text.map).pathname, "/maps/search/");
  assert.equal(new URL(text.map).searchParams.get("query"),activity.direccion);
});
test("historical/manual activities work without maps, coordinates or Google configuration", () => {
  for(const fields of [{lugar:"Histórico"},{direccion:"Calle propia"}]){
    const value={modalidad:"hibrida",...fields};
    assert.equal(puedeMostrarMapa(value),false);assert.ok(buildActividadMapsLinks(value).directions);
  }
  assert.deepEqual(buildActividadMapsLinks({modalidad:"presencial",google_place_id:"legacy"}),{directions:null,map:null});
});
