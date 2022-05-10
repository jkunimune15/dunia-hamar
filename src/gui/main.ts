/**
 * MIT License
 *
 * Copyright (c) 2021 Justin Kunimune
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import "../lib/jquery.min.js"; //TODO: I should not be using jquery
import "../lib/jspdf.umd.min.js";
import "../lib/plotly.min.js"; // note that I modified this copy of Plotly to work in vanilla ES6
import {generateTerrain} from "../society/terrain.js";
import {Surface} from "../planet/surface.js";
import {World} from "../society/world.js";
import {Random} from "../util/random.js";
import {Chart} from "../map/chart.js";
import {Azimuthal} from "../map/azimuthal.js";
import {Bonne} from "../map/bonne.js";
import {Equirectangular} from "../map/equirectangular.js";
import {Mercator} from "../map/mercator.js";
import {EqualArea} from "../map/equalarea.js";
import {Spheroid} from "../planet/spheroid.js";
import {Sphere} from "../planet/sphere.js";
import {Disc} from "../planet/disc.js";
import {Toroid} from "../planet/toroid.js";
import {LockedDisc} from "../planet/lockeddisc.js";
import {generateFactSheet} from "../society/factsheet.js";
import {loadJSON} from "../util/fileio.js";
import {Conic} from "../map/conic.js";
import {Selector} from "../util/selector.js";
import {straightSkeleton} from "../util/straightskeleton.js";
// @ts-ignore
const jsPDF = window.jspdf;
// @ts-ignore
const Plotly = window.Plotly;


const TERRAIN_COLORMAP = [
	[0.00, 'rgb(251,254,248)'],
	[0.08, 'rgb(216,231,245)'],
	[0.17, 'rgb(164, 215, 237)'],
	[0.25, 'rgb(104, 203, 206)'],
	[0.33, 'rgb( 68, 185, 156)'],
	[0.42, 'rgb(54,167,105)'],
	[0.50, 'rgb( 64, 145,  47)'],
	[0.58, 'rgb( 92, 116,  11)'],
	[0.67, 'rgb(100,89,5)'],
	[0.75, 'rgb( 99,  62,   1)'],
	[0.83, 'rgb( 91,  33,   1)'],
	[0.92, 'rgb(75,2,6)'],
	[1.00, 'rgb( 41,   4,   5)'],
];

const MIN_SIZE_TO_LIST = 6;
const MIN_COUNTRIES_TO_LIST = 3;
const MAX_COUNTRIES_TO_LIST = 20;

const dom = new Selector(document);

export const USER_STRINGS = loadJSON(`../../res/tarje/${dom.elm('bash').textContent}.json`);

enum Layer {
	NONE,
	PLANET,
	TERRAIN,
	HISTORY,
	MAP,
	PDF
}

/** which level of the model currently has all input changes applied */
let lastUpdated = Layer.NONE;
/** whether the plotly image is up to date with the model */
let planetRendered = false;
/** whether a process is currently running */
let inProgress: boolean = false; // TODO; I can't remember why this is here; if I click forward in the tabs while it's loading, does everything update?
/** the planet on which the map is defined */
let surface: Surface = null;
/** the human world on that planet */
let world: World = null;


/**
 * Generate the planet and its mean temperature (not yet accounting for altitude)
 */
function applyPlanet() {
	console.log("jena planete...");
	console.log(dom.elm('planet-type'));
	console.log(dom.val('planet-type'));
	const planetType = dom.val('planet-type'); // read input
	const tidallyLocked = dom.checked('planet-locked');
	const radius = Number(dom.val('planet-size')) / (2*Math.PI);
	const gravity = Number(dom.val('planet-gravity')) * 9.8;
	const spinRate = 1 / Number(dom.val('planet-day')) * 2*Math.PI / 3600;
	const obliquity = Number(dom.val('planet-tilt')) * Math.PI / 180;

	try { // create a surface
		if (planetType === 'bol') { // spheroid
			if (tidallyLocked) { // spherical
				surface = new Sphere(
					radius);
			}
			else { // oblate
				surface = new Spheroid(
					radius,
					gravity,
					spinRate,
					obliquity);
			}
		}
		else if (planetType === 'wen') { // toroid
			surface = new Toroid(
				radius,
				gravity,
				spinRate,
				obliquity);
		}
		else if (planetType === 'plate') { // plane
			if (tidallyLocked) { // with static sun
				surface = new LockedDisc(
					radius);
			}
			else { // with orbiting sun
				surface = new Disc(
					radius,
					obliquity);
			}
		}
		else {
			console.error(`What kind of planet is ${planetType}`);
			return;
		}
	} catch (err) {
		if (err instanceof RangeError) {
			let message: string;
			if (err.message.startsWith("Too fast"))
				message = "The planet tore itself apart. Please choose a longer day length."; // TODO: translate this.  and/or automatically correct it.
			else if (err.message.startsWith("Too slow"))
				message = "The planet broke into pieces. Please choose a shorter day length."; // TODO: translate this.  and/or automatically correct it.
			dom.elm('alert-box').append(
				"<div class='alert alert-danger alert-dismissible fade show' role='alert'>\n" +
				`  ${message}\n` +
				"  <button type='button' class='close' data-dismiss='alert' aria-label='Close'>\n" +
				"    <span aria-hidden='true'>&times;</span>\n" +
				"  </button>\n" +
				"</div>");
			return;
		} else
			throw err;
	}
	surface.initialize();

	console.log("fina!");
	lastUpdated = Layer.PLANET;
	planetRendered = false;
}


function renderPlanet() {
	if (lastUpdated < Layer.PLANET)
		applyPlanet();

	console.log("grafa planete...");
	const radius = Number(dom.val('planet-size')) / (2*Math.PI);

	const {x, y, z, I} = surface.parameterize(18);
	Plotly.react(
		dom.elm('planet-map'),
		[{
			type: 'surface',
			x: x,
			y: y,
			z: z,
			surfacecolor: I,
			cmin: 0.,
			cmax: 2.,
			colorscale: TERRAIN_COLORMAP,
			showscale: false,
			lightposition: {x: 1000, y: 0, z: 0},
			hoverinfo: "none",
			contours: {
				x: {highlight: false},
				y: {highlight: false},
				z: {highlight: false}},
		}],
		{
			margin: {l: 20, r: 20, t: 20, b: 20},
			scene: {
				xaxis: {
					showspikes: false,
					range: [-radius, radius],
				},
				yaxis: {
					showspikes: false,
					range: [-radius, radius],
				},
				zaxis: {
					showspikes: false,
					range: [-radius, radius],
				},
				aspectmode: 'cube',
			},
		},
		{
			responsive: true,
		}
	).then(() => {
	});

	console.log("fina!");
	planetRendered = true;
}


/**
 * Generate the heightmap and biomes on the planet's surface.
 */
function applyTerrain(): void {
	if (lastUpdated < Layer.PLANET)
		applyPlanet();

	console.log("jena zemforme...");
	let rng = new Random(Number(dom.val('terrain-sem'))); // use the random seed
	surface.populate(rng); // finish constructing the surface
	rng = rng.reset();
	generateTerrain(
		Number(dom.val('terrain-continents')) * 2,
		Number(dom.val('terrain-hay')),
		Number(dom.val('terrain-terme')),
		surface, rng); // create the terrain!

	console.log("grafa...");
	const mapper = new Chart(new Azimuthal(surface, true, null));
	mapper.depict(surface,
	              null,
	              dom.elm('terrain-map') as SVGGElement,
	              'jivi',
	              'nili');

	console.log("fina!");
	lastUpdated = Layer.TERRAIN;
}


/**
 * Generate the countries on the planet's surface.
 */
function applyHistory(): void {
	if (lastUpdated < Layer.TERRAIN)
		applyTerrain();

	console.log("jena histore...");
	world = new World(
		Number(dom.val('history-katastrof')),
		surface);
	let rng = new Random(Number(dom.val('history-sem'))); // use the random seed
	world.generateHistory(
		Number(dom.val('history-nen')),
		rng); // create the terrain!

	console.log("grafa...");
	const mapper = new Chart(new Azimuthal(surface, true, null));
	mapper.depict(surface,
	              world,
	              dom.elm('history-map') as SVGGElement,
	              'politiki',
	              'nili');

	console.log("mute ba chuze bil...");
	const countries = world.getCivs(true, MIN_SIZE_TO_LIST, MIN_COUNTRIES_TO_LIST) // list the biggest countries for the centering selection
		.slice(0, MAX_COUNTRIES_TO_LIST); // TODO: if there are no countries, use fisickall rejons instead
	const picker = document.getElementById('map-jung');
	picker.textContent = "";
	for (let i = 0; i < countries.length; i ++) {
		const country = countries[i];
		const option = document.createElement('option');
		option.selected = (i === 0);
		option.setAttribute('value', country.id.toString());
		option.textContent = country.getName().toString();
		picker.appendChild(option);
	}

	console.log("fina!");
	lastUpdated = Layer.HISTORY;
}


/**
 * Generate a final formatted map.
 */
function applyMap(): void {
	if (lastUpdated < Layer.HISTORY)
		applyHistory();

	console.log("grafa zemgrafe...");
	const projection = dom.val('map-projection');
	const norde = (dom.val('map-dish') === 'norde');
	const locus = Chart.border(world.getCiv(Number.parseInt(dom.val('map-jung'))));

	let mapper: Chart;
	if (projection === 'equirectangular')
		mapper = new Chart(new Equirectangular(surface, norde, locus));
	else if (projection === 'azimuthal-equidistant')
		mapper = new Chart(new Azimuthal(surface, norde, locus));
	else if (projection === 'mercator')
		mapper = new Chart(new Mercator(surface, norde, locus));
	else if (projection === 'eckert')
		mapper = new Chart(new EqualArea(surface, norde, locus));
	else if (projection === 'bonne')
		mapper = new Chart(new Bonne(surface, norde, locus));
	else if (projection === 'conic')
		mapper = new Chart(new Conic(surface, norde, locus));
	else
		throw new Error(`no jana metode da graflance: '${projection}'.`);

	mapper.depict(
		surface,
		world,
		dom.elm('map-map') as SVGGElement,
		dom.val('map-zemrang'),
		dom.val('map-hayrang'),
		dom.val('map-filter'),
		dom.checked('map-nade'),
		dom.checked('map-kenar'),
		dom.checked('map-say'),
		dom.checked('map-deshnam'),
		dom.checked('map-shannam'),
		6,
		(dom.val('map-bash') === 'null') ?
			null :
			dom.val('map-bash')
	);

	console.log("fina!");
	lastUpdated = Layer.MAP;
}


/**
 * Generate a final formatted map.
 */
function applyPdf(): void {
	if (lastUpdated < Layer.MAP)
		applyMap();

	console.log("jena pdf..."); // TODO: refactor map so that I can get this in a form that I can rite directly to the PDF.  I should probably also allow export as png somehow?
	const doc = new jsPDF.jsPDF(); // instantiate the PDF document
	// doc.addSvgAsImage = jsPDF.svg.addSvgAsImage; // and include the svg module
	// doc.addImage(mapUrl, "SVG", 5, 5, 287, 200);
	doc.text("I have to add something to this page or delete it.", 20, 20, {baseline: 'top'});

	for (const civ of world.getCivs(true)) {
		generateFactSheet(doc, civ);
	}

	const pdf = doc.output('blob');
	const pdfUrl = URL.createObjectURL(pdf);
	dom.elm('pdf-embed').setAttribute('src', pdfUrl);

	console.log("fina!");
	lastUpdated = Layer.PDF;
}


/**
 * disable all the buttons, turn on the loading icon, call the funccion, wait, then set
 * everything back to how it was before.
 * @param func
 */
function disableButtonsAndDo(func: () => void): void {
	inProgress = true;
	for (const tab of ['planet', 'terrain', 'history', 'map']) {
		dom.elm(`${tab}-apply`).setAttribute('disabled', '');
		dom.elm(`${tab}-redi`).style.display = 'none';
		dom.elm(`${tab}-lada`).style.display = null;
	}

	setTimeout(() => {
		try {
			func();
		} catch (error) {
			console.error(error);
		}

		inProgress = false;
		for (const tab of ['planet', 'terrain', 'history', 'map']) {
			dom.elm(`${tab}-apply`).removeAttribute('disabled');
			dom.elm(`${tab}-redi`).style.display = null;
			dom.elm(`${tab}-lada`).style.display = 'none';
		}
	}, 10);
}


for (const suffix of ['apply', 'tab']) {
	/**
	 * When the planet button is clicked, call its function.
	 * Note that this does not check if the planet is out of sync; it
	 * must update every time the tab is opened because of Plotly.
	 */
	dom.elm(`planet-${suffix}`).addEventListener('click', () => {
		if (!planetRendered && !inProgress)
			disableButtonsAndDo(renderPlanet);
	});

	/**
	 * When the terrain button is clicked, do its thing
	 */
	dom.elm(`terrain-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.TERRAIN && !inProgress)
			disableButtonsAndDo(applyTerrain);
	});

	/**
	 * When the history button is clicked, activate its purpose.
	 */
	dom.elm(`history-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.HISTORY && !inProgress)
			disableButtonsAndDo(applyHistory);
	});

	/**
	 * When the map button is clicked, reveal its true form.
	 */
	dom.elm(`map-${suffix}`).addEventListener('click', () => {
		if (lastUpdated < Layer.MAP && !inProgress)
			disableButtonsAndDo(applyMap);
	});
}

/**
 * When the pdf button is clicked, generate the PDF.
 */
dom.elm('pdf-tab').addEventListener('click', () => {
	if (lastUpdated < Layer.PDF && !inProgress)
		disableButtonsAndDo(applyPdf);
});


/**
 * when the inputs change, forget what we know
 */
const tabs = [
	{ layer: Layer.PLANET, name: 'planet' },
	{ layer: Layer.TERRAIN, name: 'terrain' },
	{ layer: Layer.HISTORY, name: 'history' },
	{ layer: Layer.MAP, name: 'map' },
	{ layer: Layer.PDF, name: 'pdf' },
];
for (const { layer, name } of tabs) {
	Selector.mapToAllChildren(dom.elm(`${name}-panel`), (element) => {
		const tagName = element.tagName.toLowerCase();
		if (tagName === 'input' || tagName === 'select') {
			element.addEventListener('change', () => {
				lastUpdated = Math.min(lastUpdated, layer - 1);
				if (lastUpdated < Layer.PLANET)
					planetRendered = false;
			});
		}
	});
}


/**
 * Once the page is ready, start the algorithm!
 */
document.addEventListener("DOMContentLoaded", () => {
	console.log("ready!");
	// (dom.elm('map-tab') as HTMLElement).click();
	const polygon = [
		{x: 5.465, y: 55.752},
		{x: -68.341, y: -90.632},
		{x: 2.739, y: -166.634},
		{x: 116.678, y: -147.812},
		{x: 188.6615, y: -99.2585},
		{x: 188.6650, y: -99.2645},
	];
	console.log(straightSkeleton(polygon));
}); // TODO: warn before leaving page
