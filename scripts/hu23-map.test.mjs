import assert from "node:assert/strict";
import test from "node:test";
import { mountOpenStreetMap } from "../src/lib/maps/leaflet-client.js";
import { DEFAULT_TILE_URL } from "../src/lib/maps/openstreetmap.mjs";

function setup(editable=true){
  const events={},tileEvents={},points=[],choices=[];let removed=0,markerRemoved=0,invalidated=0;
  const map={setView(point,zoom){points.push({point,zoom});return this;},on(name,fn){events[name]=fn;},off(name){delete events[name];},getCenter(){return {lat:-33.1,lng:-71.4};},remove(){removed++;},invalidateSize(){invalidated++;}};
  const tiles={addTo(){return this;},on(name,fn){tileEvents[name]=fn;},off(name){delete tileEvents[name];}};
  let tileOptions,tileUrl,marker,markers=0,errorCount=0;
  const L={map(){return map;},tileLayer(url,options){tileUrl=url;tileOptions=options;return tiles;},divIcon(options){return options;},
    marker(point,options){markers++;marker={point,options,addTo(){return this;},setLatLng(value){this.point=value;},remove(){markerRemoved++;}};return marker;}};
  const controller=mountOpenStreetMap({},L,{editable,onSelect:p=>choices.push(p),onError:()=>errorCount++});
  return {controller,events,tileEvents,points,choices,get marker(){return marker;},get markers(){return markers;},get removed(){return removed;},get markerRemoved(){return markerRemoved;},get tileOptions(){return tileOptions;},get tileUrl(){return tileUrl;},get errorCount(){return errorCount;},get invalidated(){return invalidated;}};
}
test("Leaflet mounts official visible tiles, attribution, no prefetch and one reusable marker",()=>{
  const c=setup();assert.equal(c.tileUrl,DEFAULT_TILE_URL);assert.match(c.tileOptions.attribution,/OpenStreetMap.*contributors/);
  assert.equal(c.tileOptions.keepBuffer,0);assert.equal(c.tileOptions.updateWhenIdle,true);
  c.controller.update(-33,-71);assert.deepEqual(c.marker.point,[-33,-71]);
  c.controller.update(0,0);assert.deepEqual(c.marker.point,[0,0]);assert.equal(c.markers,1);
  c.controller.update(null,null);assert.equal(c.markerRemoved,1);c.controller.destroy();assert.equal(c.removed,1);
});
test("admin click and keyboard center return only numeric coordinates; public maps never select",()=>{
  const c=setup();c.events.click({latlng:{lat:-33,lng:-71}});c.controller.selectCenter();
  assert.deepEqual(c.choices,[{latitud:-33,longitud:-71},{latitud:-33.1,longitud:-71.4}]);
  c.events.click({latlng:{lat:NaN,lng:0}});assert.equal(c.choices.length,2);
  c.controller.destroy();assert.deepEqual(c.events,{});assert.deepEqual(c.tileEvents,{});
  const publicMap=setup(false);assert.equal(publicMap.events.click,undefined);publicMap.controller.selectCenter();assert.deepEqual(publicMap.choices,[]);publicMap.controller.destroy();
});
test("tile errors are controlled and do not remove coordinates/marker",()=>{
  const c=setup();c.controller.update(-33,-71);c.tileEvents.tileerror();
  assert.equal(c.errorCount,1);assert.deepEqual(c.marker.point,[-33,-71]);c.controller.destroy();
});
test("partial mount failures release the Leaflet container for retry",()=>{
  let removed=0;
  const map={setView(){return this;},remove(){removed++;}};
  assert.throws(()=>mountOpenStreetMap({}, {map:()=>map,tileLayer(){throw Error("Invalid tiles");}}));
  assert.equal(removed,1);
});
