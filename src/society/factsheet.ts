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
import {Civ} from "./civ.js";
import {Style} from "../language/script.js";
import {format} from "../util/util.js";


/**
 * add a page to this PDF document with all the interesting informacion about the given Civ
 * @param doc
 * @param topick
 */
export function generateFactSheet(doc: any, topick: Civ) {
	doc.setProperties({
		title: "Country factsheets",
		creator: 'dunia hamar',
	});
	doc.deletePage(0);
	doc.addPage("a4", "portrait");
	doc.addFont("res/kitabuforme/NotoSans-Regular.ttf", "NotoSans", "normal");
	doc.setFont("NotoSans"); // set font

	doc.setFontSize(24);
	doc.text(
		format("{0} (pronounced: [{1}])",
			topick.getName(Style.CHANSAGI_0),
			topick.getName(Style.NASOMEDI)),
		20, 20, {baseline: 'top'}); // TODO: have a Word kno which Style it should use

	doc.setFontSize(12);
	doc.text(
		format("Area: {0} km²\nPopulation: {1}",
			topick.getArea(),
			topick.getPopulation()),
		20, 35, {baseline: 'top'});

	doc.setFontSize(18);
	doc.text(
		"Culture notes", // TODO: bold this
		20, 50, {baseline: 'top'});

	doc.setFontSize(12);
	doc.text(
		topick.maxoriaKultur.toString(), // TODO tauk about the minorities, too
		20, 60, {baseline: 'top'});
}

