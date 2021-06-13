// utils.ts: some mathy methods that need not clutter up the other files


/**
 * maximum index.
 */
export function argmax(arr: number[]): number {
	let maxIdx = null;
	for (let i = 0; i < arr.length; i ++)
		if (maxIdx === null || arr[i] > arr[maxIdx])
			maxIdx = i;
	return maxIdx;
}

/**
 * second Legendre polynomial.
 */
export function legendreP2(y: number): number {
	return (3*y*y - 1)/2;
}

/**
 * second Legendre polynomial.
 */
export function legendreP4(y: number): number {
	return ((35*y*y - 30)*y*y + 3)/8;
}

/**
 * second Legendre polynomial.
 */
export function legendreP6(y: number): number {
	return (((231*y*y - 315)*y*y + 105)*y*y - 5)/16;
}

/**
 * linearly interpolate x from the sorted function X onto the corresponding output Y.
 */
export function linterp(inVal: number, inRef: number[], exRef: number[]): number {
	if (inRef.length !== exRef.length)
		throw "array lengths must match";

	let min = 0, max = inRef.length - 1;
	while (max - min > 1) {
		const mid = Math.trunc((min + max)/2);
		if (inRef[mid] <= inVal)
			min = mid;
		else
			max = mid;
	}

	return (inVal - inRef[min])/(inRef[max] - inRef[min])*(exRef[max] - exRef[min]) + exRef[min];
}

/**
 * generate a set of three mutually orthogonal Vectors
 * @param n the direction of the n vector
 * @param normalize whether to normalize the three vectors before returning them
 * @param axis v will be chosen to be coplanar with axis and n
 * @param bias if axis and n are parallel, v will be chosen to be coplanar with axis, n, and bias
 * @returns three vectors, u, v, and n.  if they are normalized, u×v=n, v×n=u, and n×u=v.  if they aren’t then the
 * magnitudes will be whatever.  also, u will always be orthogonal to axis.  if there is an opcion,
 */
export function orthogonalBasis(n: Vector, normalize: boolean = false, axis: Vector = new Vector(0, 0, 1), bias: Vector = new Vector(1, 0, 0)): {u: Vector, v: Vector, n: Vector} {
	if (axis.cross(n).sqr() === 0) {
		axis = bias;
		if (bias.cross(n).sqr() === 0) {
			if (n.y !== 0)
				axis = new Vector(0, 0, 1);
			else
				axis = new Vector(0, 1, 0);
		}
	}

	let u = axis.cross(n);
	let v = n.cross(u);

	if (normalize) {
		u = u.norm();
		v = v.norm();
		n = n.norm();
	}

	return {u: u, v: v, n: n};
}

/**
 * combine the two arrays and remove duplicates.
 */
export function union(a: Iterable<any>, b: Iterable<any>): Iterable<any> {
	const aa = [...a];
	const ba = [...b];
	return aa.concat(ba.filter(e => !aa.includes(e)));
}

/**
 * load a static TSV resource. comments may be specified with a comment character. if a comment character is given,
 * whitespace will be stripped from each line after the comment is removed. so don't use a whitespace delimiter if you
 * want trailing empty columns and comments.
 * @param filename the filename (will search in ./res/ by default)
 * @param delimiter the symbol that indicates a column break
 * @param comment the symbol that indicates the start of a comment
 */
export function loadTSV(filename: string, delimiter: RegExp = /\t/, comment: RegExp = null): string[][] {
	const xmlHttp = new XMLHttpRequest();
	xmlHttp.open("GET", `/res/${filename}`, false); // get the file
	xmlHttp.send();
	if (xmlHttp.status !== 200)
		throw `${xmlHttp.status} error while loading '${filename}': ${xmlHttp.statusText}`;
	const arr = [];
	for (let line of xmlHttp.responseText.split('\n')) { // read it line-by-line
		const matchObject = line.match(comment);
		if (matchObject !== null && matchObject.index === 0) continue; // skip the line if it is all one comment
		line = line.split(comment)[0]; // remove the comment
		if (comment !== null) {
			line = line.replace(/\s+$/, '') // remove trailing whitespace
			line = line.replace(/^\s+/, '') // remove leading whitespace
		}
		if (line.length !== 0) arr.push(line.split(delimiter)); // if the line is nonempty, record it
	}
	return arr;
}

/**
 * perform a Nelder-Mead simplex search to find a local minimum of the function f. this implementation is not well-
 * optimized for large numbers of dimensions
 * @param f the function to minimize
 * @param x0 the initial guess
 * @param simplexScale the distance along each dimension to step when constructing the initial simplex
 * @param tol the relative error threshold for termination
 */
export function minimizeNelderMead(f: (n: number[]) => number, x0: number[], simplexScale: number[], tol:number) {
	const α = 1, γ = 2, ρ = 1/2., σ = 1/2.; // declare values

	const x: number[][] = []; // the vertices of the simplex
	const fx: number[] = []; // the values of f at the vertices
	for (let i = 0; i <= x0.length; i ++) {
		x.push(x0.slice()); // initialize the vertices as the guess
		if (i < x0.length)
			x[i][i] += simplexScale[i]; // with multidimensional perturbations
		fx.push(f(x[i])); // and get the initial values
	}
	if (!Number.isFinite(fx[x0.length]))
		throw new Error(`Initial guess yielded bunk value: ${fx[x0.length]}`);

	while (true) { // now for the iterative part
		const rank = []; // sort indices of dimensions from worst (highest) to best (lowest)
		for (let i = 0; i < x.length; i ++)
			rank.push(i);
		rank.sort((a: number, b: number) => fx[b] - fx[a]);

		let completelyConvergedInSpace = true;
		for (let j = 0; j < x0.length; j ++) { // check termination conditions
			if (Math.abs(x[rank[x0.length]][j] - x[rank[0]][j]) > tol*Math.abs(simplexScale[j]))
				completelyConvergedInSpace = false;
		}
		if (completelyConvergedInSpace)
			return x[rank[x0.length]];

		const xC = new Array(x0.length).fill(0);
		for (let j = 0; j < x0.length; j ++) {
			for (let i = 0; i < x0.length + 1; i++) { // compute the best-guess centroid
				if (i !== rank[0])
					xC[j] += x[i][j]/x0.length;
			}
		}

		const xR = new Array(x0.length);
		for (let j = 0; j < x0.length; j ++)
			xR[j] = xC[j] + α*(xC[j] - x[rank[0]][j]); // compute the reflected point
		const fxR = f(xR);

		if (fxR < fx[rank[x0.length]]) { // if this is the best point yet
			const xE = new Array(x0.length);
			for (let j = 0; j < x0.length; j ++)
				xE[j] = xC[j] + γ*(xR[j] - xC[j]); // compute the expanded point
			const fxE = f(xE);

			if (fxE < fxR) {
				x[rank[0]] = xE;
				fx[rank[0]] = fxE;
			}
			else {
				x[rank[0]] = xR;
				fx[rank[0]] = fxR;
			}
		}
		else if (fxR < fx[rank[1]]) { // if this is better than the second worst
			x[rank[0]] = xR;
			fx[rank[0]] = fxR;
		}
		else {
			const xS = new Array(x0.length);
			for (let j = 0; j < x0.length; j ++)
				xS[j] = xC[j] + ρ*(x[rank[0]][j] - xC[j]); // compute the contracted point
			const fxS = f(xS);

			if (fxS < fx[rank[0]]) { // if that's better than the reflected point
				x[rank[0]] = xS;
				fx[rank[0]] = fxS;
			}
			else {
				for (let i = 0; i < x0.length + 1; i ++) { // if it's all complete garbage
					if (i !== rank[x0.length]) {
						for (let j = 0; j < x0.length; j ++) {
							x[i][j] = x[rank[x0.length]][j] + σ*(x[i][j] - x[x0.length][j]); // move all vertices toward the best one
							fx[i] = f(x[i]);
						}
					}
				}
			}
		}
	}
}

/**
 * cover a field of points in Delaunay triangles.
 * @param points the list of points in 3-space that are to be triangulated
 * @param normals the normal vector of the triangulated circle at each point, assumed to be [0,0,1] if not specified.
 * @param sample optional set of dummy points to seed the surface
 * @param sampleNormals normal vectors to go with sample
 * @param partition optional set of starter triangles to establish topology, represented as arrays of sample indices.
 * the partition must contain all points if given, and must be given for non-planes.
 */
export function delaunayTriangulate(points: Vector[], normals: Vector[] = [new Vector(0, 0, 1)],
									sample: Vector[] = [], sampleNormals: Vector[] = [new Vector(0, 0, 1)],
									partition: number[][] = []
									): {triangles: number[][], parentage: number[][], between: number[][][]} {
	// const stuff = partition.length === 0;
	if (partition.length === 0) { // start by creating a partition if we have none
		let xMax = Number.NEGATIVE_INFINITY, xMin = Number.POSITIVE_INFINITY;
		let yMax = Number.NEGATIVE_INFINITY, yMin = Number.POSITIVE_INFINITY;
		for (let i = 0; i < points.length; i ++) {
			if (points[i].z !== 0) // assert that it is in fact a plane (remove this if I ever need to implement for not a plane)
				throw "me yexo no bina autonomi fene da no plate.";
			if (points[i].x > xMax) xMax = points[i].x; // and get the bounding box in the x-y plane
			if (points[i].x < xMin) xMin = points[i].x;
			if (points[i].y > yMax) yMax = points[i].y;
			if (points[i].y < yMin) yMin = points[i].y;
		}
		sample = [
			new Vector(2*xMin - xMax, 2*yMin - yMax, 0), // set the sample to the corners of the bounding boxen
			new Vector(2*xMax - xMin, 2*yMin - yMax, 0),
			new Vector(2*xMax - xMin, 2*yMax - yMin, 0),
			new Vector(2*xMin - xMax, 2*yMax - yMin, 0),
		];
		partition = [[0, 1, 2], [2, 3, 0]]; // and triangulate it trivially
	}

	const nodos: DelaunayNodo[] = []; // convert the primitive inputs into our own object formats
	for (let i = 0; i < sample.length; i ++)
		nodos.push(new DelaunayNodo(i - sample.length, sample[i], sampleNormals[i%sampleNormals.length]));
	const triangles = partition.map((t: number[]) =>
		new DelaunayTriangle(nodos[t[0]], nodos[t[1]], nodos[t[2]], true));
	for (let i = 0; i < points.length; i ++)
		nodos.push(new DelaunayNodo(i, points[i], normals[i%normals.length]));

	// console.log(`particion = np.array([`);
	// for (const node of sample)
	// 	console.log(`[${node.x}, ${node.y}, ${node.z}],`);
	// console.log(`])`);
	// console.log(`nodos = np.array([`);
	// for (const node of nodos.slice(sample.length, sample.length+50))
	// 	console.log(`[${node.r.x}, ${node.r.y}, ${node.r.z}],`);
	// console.log(`])`);

	// console.log(`triangles = [`);
	for (const node of nodos.slice(sample.length)) { // for each node,
		// if (node.i >= 50) {
		// 	console.log(']');
		// 	throw "ew";
		// }
		const containing = findSmallestEncompassing(node, triangles); // find out which triangle it's in
		for (let j = 0; j < 3; j ++) { // add the three new child triangles
			triangles.push(new DelaunayTriangle(
				node,
				containing.nodos[j],
				containing.nodos[(j + 1) % 3]));
		}
		containing.children = triangles.slice(triangles.length - 3); // we could remove containing from triangles now, but it would be a waste of time
		const flipQueue = []; // start a list of edges to try flipping
		for (let i = 0; i < 3; i ++)
			flipQueue.push(new DelaunayEdge(containing.nodos[i], containing.nodos[(i+1)%3])); // and put the edges of this triangle on it
		const flipHistory = flipEdges(flipQueue, triangles, [], node); // do the flipping thing
		node.parents = [];
		for (const triangle of node.triangles) { // its parentage is all currently connected non-dummy nodes
			if (triangle.children === null && widershinsOf(node, triangle).i >= 0)
				node.parents.push(widershinsOf(node, triangle));
		}
		for (const edge of flipHistory) { // keep track of the edges that this node flipped; it is "between" those endpoints
			if (edge.a.i >= 0 && edge.b.i >= 0)
				node.between.push([edge.a, edge.b]);
		}

		// console.log(`[`);
		// for (let j = 0; j < triangles.length; j ++)
		// 	if (triangles[j].children === null)
		// 		console.log(`[${triangles[j].nodos[0].i}, ${triangles[j].nodos[1].i}, ${triangles[j].nodos[2].i}],`);
		// console.log(`],`);
	}
	// console.log(`]`);

	for (const node of nodos.slice(0, sample.length)) { // now remove the partition vertices
		// console.log(node);
		triangles.push(...removeNode(node));
	}

	const triangleIdx = triangles.filter((t: DelaunayTriangle) => t.children === null)
		.map((t: DelaunayTriangle) => t.nodos.map((n: DelaunayNodo) => n.i));
	const parentIdx = nodos.filter((n: DelaunayNodo) => n.i >= 0)
		.map((n: DelaunayNodo) => n.parents.map((n: DelaunayNodo) => n.i));
	const betweenIdx = nodos.filter((n: DelaunayNodo) => n.i >= 0)
		.map((n: DelaunayNodo) => n.between.map((ns: DelaunayNodo[]) => [ns[0].i, ns[1].i]));
	return {triangles: triangleIdx, parentage: parentIdx, between: betweenIdx}; // convert all to indices and return
}

/**
 * remove all Triangles and Edges connected to the given node, and return a list of new
 * Triangles between the surrounding nodes to replace them.
 * @param node the dummy node to be removed
 * @return array of new Triangles
 */
function removeNode(node: DelaunayNodo): DelaunayTriangle[] {
	const oldTriangles: DelaunayTriangle[] = [[...node.triangles].filter((t: DelaunayTriangle) => t.children === null)[0]]; // starting with an arbitrary neighboring triangle
	while (true) { // trace the graph to find the surrounding triangles in widershins order
		let prev = oldTriangles[oldTriangles.length - 1];
		let med = clockwiseOf(node, prev);
		let next;
		try {
			next = triangleOf(node, med);
		} catch {
			next = null;
		}

		if (next === null) { // if you come up short,
			while (true) { // do the same thing in the other direction
				let prev = oldTriangles[0];
				let med = widershinsOf(node, prev);
				let next;
				try {
					next = triangleOf(med, node);
				} catch {
					next = null;
				}

				if (next === null)
					break;
				else
					oldTriangles.splice(0, 0, next);
			}
			return removeNodeHull(node, oldTriangles); // and call the exterior node function
		}

		else if (next === oldTriangles[0]) // otherwise go until you get back to whence you started
			break;
		else
			oldTriangles.push(next);
	}
	return removeNodeInterior(node, oldTriangles); // and then call the embeded node function
}

/**
 * remove all Triangles and Edges connected to the given interior node, given the Triangles that completely surround it.
 * @param node the dummy node to be removed
 * @param surroundings all triangles connected to node to be destroyed, in widershins order
 */
function removeNodeInterior(node: DelaunayNodo, surroundings: DelaunayTriangle[]): DelaunayTriangle[] {
	const newTriangles: DelaunayTriangle[] = [];
	const flipQueue: DelaunayEdge[] = [], flipImmune: DelaunayEdge[] = [];
	arbitrationLoop:
	for (let i0 = 0; i0 < surroundings.length; i0 ++) { // we have to pick an arbitrary border node to start this process
		const a = clockwiseOf(node, surroundings[i0]); // choosing i0 is harder than it may seem if we want to avoid coincident triangles
		for (let j = 2; j < surroundings.length-1; j ++) { // run through all the edges we're going to make
			const c = clockwiseOf(node, surroundings[(i0 + j)%surroundings.length]);
			if (isAdjacentTo(a, c)) // and check if any of them already exist
				continue arbitrationLoop; // if so, try a different start
		}
		for (let j = 0; j < surroundings.length; j ++) { // begin fixing the gap left by this null node
			const b = widershinsOf(node, surroundings[(i0 + j)%surroundings.length]);
			const c = clockwiseOf(node, surroundings[(i0 + j)%surroundings.length]);
			surroundings[j].children = []; // by disabling the triangles that used to fill it
			if (j >= 2)
				newTriangles.push(new DelaunayTriangle(a, b, c)); // and filling it with new, naively placed triangles
			if (j >= 2 && j < surroundings.length-1)
				flipQueue.push(new DelaunayEdge(a, c)); // keep track of the edges to be flipped
			flipImmune.push(new DelaunayEdge(b, c)); // and to avoid being flipped
		} // if you make it to the end of the for loop, then arbitrary was a fine choice
		break; // and we can proceed
	}

	flipEdges(flipQueue, newTriangles, flipImmune); // do the part where we make it delaunay
	return newTriangles;
}

/**
 * remove all Triangles and Edges connected to the given hull node, given the Triangles that connect it to the interior.
 * @param node the dummy node to be removed
 * @param neighbors all triangles connected to node to be destroyed, ordered from right to left from Node's perspective
 */
function removeNodeHull(node: DelaunayNodo, neighbors: DelaunayTriangle[]): DelaunayTriangle[] {
	const newTriangles: DelaunayTriangle[] = [];
	const flipQueue: DelaunayEdge[] = [];
	for (let i = neighbors.length-1; i > 0; i --) { // for each edge connected to node
		const a = widershinsOf(node, neighbors[i-1]); // consider what would happen if you flipped it
		const b = clockwiseOf(node, neighbors[i-1]);
		const c = clockwiseOf(node, neighbors[i]);
		const [ap, bp, cp] = flatten(a, b, c); // project their positions into the normal plane
		if (isRightSideOut(ap, bp, cp)) { // if the resulting triangle could be considered a triangle by the weakest possible definition
			neighbors[i-1].children = neighbors[i].children = []; // flip it
			neighbors.splice(i - 1, 1, new DelaunayTriangle(c, node, a)); // you get a new triangle in neighbors
			newTriangles.push(new DelaunayTriangle(a, b, c)); // and a new triangle in newTriangles
			flipQueue.push(new DelaunayEdge(a, c));
		}
	}
	for (const triangle of node.triangles) // make sure these are all gone
		triangle.children = [];
	flipEdges(flipQueue, newTriangles); // and do some Delaunay checking
	return newTriangles;
}

/**
 * Go through the queue and flip any non-delaunay edges. After flipping an edge, add
 * adjacent edges to the queue. Do not check edges that have newestNode as an endpoint or
 * that are in immune.
 * @param queue initial edges to check
 * @param triangles the list of all Triangles, which must be kept up to date
 * @param immune edges that do not need to be checked
 * @param newestNode a node for which any edges that touch it need not be checked
 * @return Array of Edges that were flipped
 */
export function flipEdges(queue: DelaunayEdge[], triangles: DelaunayTriangle[],
						  immune: DelaunayEdge[] = [], newestNode: DelaunayNodo = null): DelaunayEdge[] {
	const flipped: DelaunayEdge[] = [];

	while (queue.length > 0) { // go through that queue
		const edge = queue.pop(); // extract the needed geometric entities
		const a = edge.a;
		const c = edge.b;
		let abc = null, cda = null;
		try { // be careful when getting the hypothetical cross edge
			abc = triangleOf(c, a)
			cda = triangleOf(a, c);
		} catch { // if you can't find a triangle on one side or the other
			continue; // it might mean you've hit the end of the partition (I'm sure it's fine)
		}
		const b = widershinsOf(a, abc);
		const d = widershinsOf(c, cda);

		const [ap, bp, cp, dp] = flatten(a, b, c, d); // project their positions into the normal plane
		if (!isDelaunay(ap, bp, cp, dp)) { // and check for non-Delaunay edges
			triangles.push(new DelaunayTriangle(b, c, d)); // if it is so, add new triangles
			triangles.push(new DelaunayTriangle(d, a, b));
			abc.children = cda.children = triangles.slice(triangles.length-2); // remove the old ones by assigning them children
			flipped.push(new DelaunayEdge(a, c)); // record this
			immune.push(new DelaunayEdge(a, c));
			const perimeter = [new DelaunayEdge(a, b), new DelaunayEdge(b, c), new DelaunayEdge(c, d), new DelaunayEdge(d, a)];
			addToQueueLoop:
			for (const nextEdge of perimeter) { // and add the neighbors to the queue
				for (const safeEdge of queue.concat(immune))
					if (nextEdge.a === safeEdge.a && nextEdge.b === safeEdge.b)
						continue addToQueueLoop; // taking care to skip edges that have already been flipped
				if (nextEdge.a === newestNode || nextEdge.b === newestNode)
					continue;
				queue.push(nextEdge);
			}
		}
	}

	return flipped;
}

/**
 * Average the normal vectors of the given nodes and project them into the plane perpendicular to that normal.
 * @param nodes
 */
export function flatten(...nodes: DelaunayNodo[]) {
	let n = new Vector(0, 0, 0);
	for (const node of nodes)
		n = n.plus(node.n);
	const {u, v} = orthogonalBasis(n, true);
	const projected = [];
	for (const node of nodes)
		projected.push({x: node.r.dot(u), y: node.r.dot(v)});
	return projected;
}

/**
 * Check whether a--c is a Delaunay edge in 2D given the existence of b and d
 */
function isDelaunay(a: {x: number, y: number}, b: {x: number, y: number},
					c: {x: number, y: number}, d: {x: number, y: number}): boolean {
	const mat = [
		[a.x - d.x, a.y - d.y, a.x*a.x + a.y*a.y - d.x*d.x - d.y*d.y],
		[b.x - d.x, b.y - d.y, b.x*b.x + b.y*b.y - d.x*d.x - d.y*d.y],
		[c.x - d.x, c.y - d.y, c.x*c.x + c.y*c.y - d.x*d.x - d.y*d.y],
	];
	let det = 0;
	for (let i = 0; i < 3; i ++) {
		det = det +
			mat[0][ i     ] * mat[1][(i+1)%3] * mat[2][(i+2)%3] -
			mat[0][(i+2)%3] * mat[1][(i+1)%3] * mat[2][ i     ];
	}
	return det < 0;
}

/**
 * Check whether a--b--c is a right-side-out triangle (return false if it's within machine precision of colinearity)
 */
function isRightSideOut(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}): boolean {
	return a.x*(b.y - c.y) + b.x*(c.y - a.y) + c.x*(a.y - b.y) > 1e-14*(a.x**2 + a.y**2);
}

/**
 * go down the chain of triangles to find the one that contains this point
 * @param node the node being encompassed
 * @param triangles the top-level list of triangles in which to search
 */
function findSmallestEncompassing(node: DelaunayNodo, triangles: Iterable<DelaunayTriangle>): DelaunayTriangle {
	let bestTriangle: DelaunayTriangle = null;
	let bestDistance: number = Number.POSITIVE_INFINITY;
	for (const triangle of triangles) {
		if (contains(triangle, node)) {
			const d2 = /*(triangle.basic) ?*/ distanceSqr(triangle, node);// : 0; // we need to check the distance in case there are multiple candies
			if (d2 < bestDistance)
				[bestDistance, bestTriangle] = [d2, triangle];
		}
	}

	// for (const triangle of triangles) {
	// 	console.log(`[`);
	// 	for (let i = 0; i <= 3; i ++) {
	// 		const a = (i < 3) ? triangle.nodos[i] : node;
	// 		console.log(`[${a.r.x}, ${a.r.y}, ${a.r.z}, ${a.n.x}, ${a.n.y}, ${a.n.z}],`);
	// 	}
	// 	if (contains(triangle, node))
	// 		console.log(`[0,0,0,0,0,0]],`);
	// 	else
	// 		console.log(`[1,1,1,1,1,1]],`);
	// }

	if (bestTriangle === null)
		throw new RangeError("no eureka tingon da indu");
	else if (bestTriangle.children === null)
		return bestTriangle;
	else
		return findSmallestEncompassing(node, bestTriangle.children);
}

/**
 * determine whether this triangle contains the given Nodo, using its neighbors to
 * hint at the direction of the surface. must return false for points outside the
 * triangle's circumcircle.
 * @param triangle the containing triangle
 * @param p the point being contained
 */
function contains(triangle: DelaunayTriangle, p: DelaunayNodo): boolean {
	const totalNormal = triangle.nodos[0].n.plus(triangle.nodos[1].n).plus(triangle.nodos[2].n);
	if (p.n.dot(totalNormal) < 0)
		return false; // check alignment on the surface
	for (let i = 0; i < 3; i ++) {
		const a = triangle.nodos[i];
		const na = a.n;
		const b = triangle.nodos[(i+1)%3];
		const nb = b.n;
		const edgeDirection = b.r.minus(a.r);
		const normalDirection = na.plus(nb);
		const boundDirection = normalDirection.cross(edgeDirection);
		if (boundDirection.dot(p.r.minus(a.r)) < 0)
			return false; // check each side condition
	}
	return true;
}

/**
 * compute the square of the minimum distance from this triangle to this Nodo.
 * @param triangle
 * @param p
 */
function distanceSqr(triangle: DelaunayTriangle, p: DelaunayNodo): number {
	for (let i = 0; i < 3; i ++) { // for each edge
		const [a, b, c] = [triangle.nodos[i%3], triangle.nodos[(i+1)%3], triangle.nodos[(i+2)%3]];
		const u = b.r.minus(a.r); // throw together some quick orthogonal alined with each edge
		const v = triangle.n.cross(u);
		const t = v.dot(p.r.minus(a.r)); // project onto the perpendicular plane
		if (t < 0) { // if it lands outside the triangle
			const s = u.dot(p.r.minus(a.r)); // project onto the edge plane
			if (s <= 0) { // if it falls too far to the left
				if (c.r.minus(a.r).dot(p.r.minus(a.r)) > 0) // check whether it falls into the domain of the last edge
					continue; // otherwise,
				return p.r.minus(a.r).sqr(); // it's the distance to this vertex
			}
			else if (s >= u.dot(b.r.minus(a.r))) { // if it's too far to the rite
				if (c.r.minus(b.r).dot(p.r.minus(a.r)) > 0) // check whether it falls into the domain of the next edge
					continue; // otherwise,
				return p.r.minus(b.r).sqr(); // it's the distance to that vertex
			}
			else // if it's in the middle
				return p.r.minus(a.r).sqr() - u.dot(p.r.minus(a.r))**2/u.sqr(); // compute the point-line distance
		}
	}
	return Math.pow(p.r.minus(triangle.nodos[0].r).dot(triangle.n), 2)/triangle.n.sqr(); // compute the point-plane distance
}

/**
 * find the Nodo that appears after node on this triangle.
 * @param node
 * @param triangle
 */
function widershinsOf(node: DelaunayNodo, triangle: DelaunayTriangle) {
	for (let i = 0; i < 3; i ++)
		if (triangle.nodos[i] === node)
			return triangle.nodos[(i+1)%3];
	throw "This node isn't even in this triangle.";
}

/**
 * find the Nodo that appears previous to node on this triangle.
 * @param node
 * @param triangle
 */
function clockwiseOf(node: DelaunayNodo, triangle: DelaunayTriangle) {
	for (let i = 0; i < 3; i ++)
		if (triangle.nodos[i] === node)
			return triangle.nodos[(i+2)%3];
	throw "This node isn't even in this triangle.";
}

/**
 * find the Triangle that has these two Nodes in this order
 */
function triangleOf(a: DelaunayNodo, b: DelaunayNodo) {
	for (const triangle of a.triangles)
		if (triangle.children === null && widershinsOf(a, triangle) === b)
			return triangle;
	throw "these nodes don't appear to have a triangle";
}

/**
 * is there an edge between these two nodes?
 * @param a
 * @param b
 */
function isAdjacentTo(a: DelaunayNodo, b: DelaunayNodo) {
	for (const triangle of a.triangles)
		if (triangle.children === null && b.triangles.has(triangle))
			return true;
	return false;
}

/**
 * a delaunay node (voronoi polygon)
 */
export class DelaunayNodo {
	public i: number; // index
	public r: Vector; // position
	public n: Vector; // normal vector
	public triangles: Set<DelaunayTriangle>; // attached triangles
	public parents: DelaunayNodo[]; // parent nodes
	public between: DelaunayNodo[][]; // parent nodes it separates

	constructor(i: number, r: Vector, n: Vector) {
		this.i = i;
		this.r = r;
		this.n = n;
		this.triangles = new Set();
		this.parents = [];
		this.between = [];
	}
}

/**
 * a delaunay triangle (voronoi vertex)
 */
class DelaunayTriangle {
	public readonly nodos: DelaunayNodo[];
	public children: DelaunayTriangle[];
	public readonly basic: boolean;
	public readonly n: Vector;

	constructor(a: DelaunayNodo, b: DelaunayNodo, c: DelaunayNodo, basic: boolean = false) {
		this.nodos = [a, b, c];
		this.children = null;
		this.basic = basic;
		for (const v of this.nodos)
			v.triangles.add(this);
		this.n = b.r.minus(a.r).cross(c.r.minus(a.r));
	}
}

/**
 * a delaunay edge, connecting two nodes and two triangles
 */
class DelaunayEdge {
	public a: DelaunayNodo;
	public b: DelaunayNodo;

	constructor(a: DelaunayNodo, b: DelaunayNodo) {
		this.a = (a.i < b.i) ? a : b; // set up the order so a always has the lower index
		this.b = (a.i < b.i) ? b : a;
	}
}


/**
 * A simple class to bind vector operations
 */
export class Vector {
	public x: number;
	public y: number;
	public z: number;

	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	times(a: number): Vector {
		return new Vector(
			this.x * a,
			this.y * a,
			this.z * a);
	}

	over(a: number): Vector {
		return new Vector(
			this.x / a,
			this.y / a,
			this.z / a);
	}

	plus(that: Vector): Vector {
		return new Vector(
			this.x + that.x,
			this.y + that.y,
			this.z + that.z);
	}

	minus(that: Vector): Vector {
		return new Vector(
			this.x - that.x,
			this.y - that.y,
			this.z - that.z);
	}

	dot(that: Vector): number {
		return (
			this.x*that.x +
			this.y*that.y +
			this.z*that.z);
	}

	cross(that: Vector): Vector {
		return new Vector(
			this.y*that.z - this.z*that.y,
			this.z*that.x - this.x*that.z,
			this.x*that.y - this.y*that.x);
	}

	sqr(): number {
		return this.dot(this);
	}

	norm(): Vector {
		return this.over(Math.sqrt(this.sqr()));
	}

	toString(): string {
		return `<${Math.trunc(this.x)}, ${Math.trunc(this.y)}, ${Math.trunc(this.z)}>`;
	}
}


/**
 * a data structure storing a series of nonintersecting segments on a line, with the ability
 * to efficiently erode all segments by the same amount.
 */
export class ErodingSegmentTree {
	/** the remaining height it can erode before being empty (half-width of the largest interval) */
	private radius: number;
	/** the center of the largest remaining interval */
	private pole: number;
	/** the link with the leftmost endpoint */
	private minim: Link;
	/** the link with the rightmost endpoint */
	private maxim: Link;
	/** the link with the root endpoint */
	private mul: Link;
	/** the number of additions so far */
	private index: number;
	
	constructor(xMin: number, xMax: number) {
		if (xMin > xMax)
			throw RangeError("initial range must be positive!");
		this.minim = new Link(xMin, true, 0, null);
		this.maxim = new Link(xMax, false, 1, this.minim, this.minim, null);
		this.mul = this.minim;
		this.radius = (xMax - xMin)/2;
		this.pole = (xMax + xMin)/2;
		this.index = 1;
	}

	/**
	 * remove the region between xL and xR from the segments.
	 * @param xL
	 * @param xR
	 */
	block(xL: number, xR: number): void {
		if (xL > xR)
			throw RangeError("blocking range must be positive!");
		let left = this.search(xL, this.mul); // find the left bound
		if (left !== null && left.esaLeft) // if it is in an included area
			left = this.insert(xL, false, this.mul); // insert a new Link
		let rait = this.search(xR, this.mul);
		rait = (rait !== null) ? rait.bad : this.minim; // find the right bound
		if (rait !== null && !rait.esaLeft) // if it is in an included area
			rait = this.insert(xR, true, this.mul); // find the right bound

		if (left === null || left.bad !== rait) // if there was anything between them
			this.deleteBetween(left, rait, this.mul); // remove it

		if ((left === null || this.pole >= left.val) || (rait === null || this.pole <= rait.val)) { // if you touched the pole, recalculate it
			this.radius = 0;
			this.pole = Number.NaN;
			let link = this.minim;
			while (link !== null) {
				if (link.bad.val - link.val > 2 * this.radius) {
					this.radius = (link.bad.val - link.val) / 2;
					this.pole = (link.bad.val + link.val) / 2;
				}
				link = link.bad.bad;
			}
		}
	}

	/**
	 * move all endpoints inward by t, and remove now empty intervals.
	 * @param t
	 */
	erode(t: number): void {
		let link = this.minim;
		while (link !== null) {
			if (link.bad.val - link.val <= 2*t) {
				const next = link.bad.bad;
				this.deleteBetween(link.cen, next, this.mul);
				link = next;
			}
			else {
				link.val += t;
				link.bad.val -= t;
				link = link.bad.bad;
			}
		}
		this.radius -= t;
	}

	/**
	 * is this value contained in one of the segments?
	 * @param value
	 */
	contains(value: number): boolean {
		const left = this.search(value, this.mul);
		return left !== null && left.esaLeft;
	}

	/**
	 * find the endpoint nearest this value.
	 * @param value
	 */
	nearest(value: number): number {
		const left = this.search(value, this.mul);
		const rait = left.bad;
		if (value - left.val < rait.val - value)
			return left.val;
		else
			return rait.val;
	}

	/**
	 * insert a new value, with it's esaLeft parameter, in the proper place
	 * @param value
	 * @param left
	 * @param start
	 */
	insert(value: number, left: boolean, start: Link): Link {
		if (start.val <= value) {
			if (start.raitPute !== null)
				return this.insert(value, left, start.raitPute); // look in the right subtree
			else
				return start.raitPute = new Link(value, left, this.index += 1, start, start, start.bad); // this _is_ the right subtree
		}
		else {
			if (start.leftPute !== null)
				return this.insert(value, left, start.leftPute); // look in the left subtree
			else
				return start.leftPute = new Link(value, left, this.index += 1, start, start.cen, start); // this _is_ the left subtree
		}
	}

	/**
	 * search for the last element e in the subtree from start, such that e.val <= value
	 * @param value
	 * @param start
	 */
	search(value: number, start: Link): Link {
		if (start.val <= value) { // if it could be start
			let res = null;
			if (start.raitPute !== null) // look in the right subtree
				res = this.search(value, start.raitPute);
			if (res === null) // if there was no right subtree or the search turn up noting
				return start; // the answer is start
			else
				return res; // otherwise return whatever you found
		}
		else { // if it is left of start
			if (start.leftPute !== null)
				return this.search(value, start.leftPute); // look in the left tree. if it's not there, it's not here.
			else
				return null;
		}
	}

	/**
	 * delete all Links between these two, excluding these two
	 * @param left
	 * @param rait
	 * @param start the root of the subtree where we're doing
	 */
	deleteBetween(left: Link, rait: Link, start: Link): void { // TODO how will this work with identical leavs?
		if (start === this.mul) { // if this is the top level, there's some stuff we need to check
			if (left === null && rait === null) { // if we're deleting the whole thing
				this.mul = null; // delete the whole thing and be done
				return;
			}
			else if (left === null) // if we're deleting the left side
				this.minim = rait; // get the new minim
			else if (rait === null)
				this.maxim = left; // get the new maxim
		}
		console.assert(start !== null);

		const raitOfCenter = rait === null || start.cena(rait); // does the right bound include start?
		const leftOfCenter = left === null || left.cena(start); // does the left bound include start?
		if (leftOfCenter && start.leftPute !== null) { // we need to check the left side
			if (left === null && (rait === start || raitOfCenter)) // if we can,
				start.leftPute = null; // drop the entire left branch
			else if (rait === start || raitOfCenter) // if not but at least the right side of left is all taken
				this.deleteBetween(left, null, start.leftPute); // check the left side of the left branch
			else // if there are no shortcuts
				this.deleteBetween(left, rait, start.leftPute); // check the whole left branch
		}
		if (raitOfCenter && start.raitPute !== null) { // we need to check the right side
			if (rait === null && (left === start || leftOfCenter)) // if we can,
				start.raitPute = null; // drop the entire right branch
			else if (left === start || leftOfCenter) // if not but at least the left side of right is all taken
				this.deleteBetween(null, rait, start.raitPute); // check the left side of the right branch
			else // if there are no shortcuts
				this.deleteBetween(left, rait, start.raitPute); // check the whole right branch
		}
		if (raitOfCenter && leftOfCenter) { // we need to delete this node
			this.delete(start);
		}

		if (left !== null)
			left.bad = rait;
		if (rait !== null)
			rait.cen = left;
	}

	/**
	 * remove a single node from the tree, keeping its children
	 * @param link
	 */
	delete(link: Link) {
		if (link.leftPute === null) {
			if (link.raitPute === null) { // if there are no children
				if (link.jener === null)
					this.mul = null;
				else if (link.jener.leftPute === link)
					link.jener.leftPute = null; // just delete it
				else
					link.jener.raitPute = null;
			}
			else { // if there is a rait child
				if (link === this.mul)
					this.mul = link.raitPute;
				link.kopiyu(link.raitPute); // move it here
			}
		}
		else {
			if (link.raitPute === null) { // if there is a left child
				if (link === this.mul)
					this.mul = link.leftPute;
				link.kopiyu(link.leftPute); // move it here
			}
			else { // if there are two children
				let veriBad = link.raitPute; // find the successor
				while (veriBad.leftPute !== null) // (don't use .bad because that one may have been deleted)
					veriBad = veriBad.leftPute;
				this.delete(veriBad); // cut that successor out of the graph
				if (link === this.mul)
					this.mul = veriBad;
				link.kopiyu(veriBad); // then reinsert it, overwriting this one
				veriBad.getaPute(link.leftPute, link.raitPute); // and transfer any remaining children to the successor
			}
		}
	}

	getClosest(value: number) {
		let closest = Number.NaN;
		let link = this.minim;
		while (link !== null) {
			if (Number.isNaN(closest) || Math.abs(link.val - value) < Math.abs(closest - value))
				closest = link.val;
			link = link.bad;
		}
		return closest;
	}

	getMinim(): number {
		return this.minim.val;
	}

	getMaxim(): number {
		return this.maxim.val;
	}

	getRadius(): number {
		return this.radius;
	}

	getPole(): number {
		return this.pole;
	}

	print(subtree: Link = null, indent: number = 0): void {
		if (subtree === null)
			subtree = this.mul;
		if (subtree === null) {
			console.log(`∅`);
			return;
		}
		let chenfikse = "";
		for (let i = 0; i < indent; i ++)
			chenfikse += "  ";
		console.log(chenfikse+`${subtree.val}#${subtree.index} (child of #${(subtree.jener === null) ? 'n' : subtree.jener.index}; #${(subtree.cen === null) ? 'n' : subtree.cen.index}<t<#${(subtree.bad === null) ? 'n' : subtree.bad.index})`);
		if (subtree.leftPute === null)
			console.log(chenfikse+"  -");
		else
			this.print(subtree.leftPute, indent + 1);
		if (subtree.raitPute === null)
			console.log(chenfikse+"  -");
		else
			this.print(subtree.raitPute, indent + 1);

		if (subtree === this.mul) {
			let l = this.minim;
			let str = '';
			while (l !== null) {
				if (l.esaLeft)
					str += `[${l.val}#${l.index}, `;
				else
					str += `${l.val}#${l.index}] `;
				l = l.bad;
			}
			console.log(str);
		}
	}
}

class Link {
	public jener: Link;
	public leftPute: Link;
	public raitPute: Link;
	public cen: Link;
	public bad: Link;
	public val: number;
	public esaLeft: boolean;
	public readonly index: number;

	constructor(val: number, left: boolean, index: number, jener: Link, cen: Link = null, bad: Link = null) {
		this.val = val;
		this.esaLeft = left;
		this.index = index;

		this.jener = jener;
		this.leftPute = null;
		this.raitPute = null;
		if (jener !== null) {
			if (jener === cen)
				jener.raitPute = this;
			else if (jener === bad)
				jener.leftPute = this;
			else
				throw "you can't insert a new leaf under neither of its neighbors; that makes no sense.";
		}

		this.cen = cen;
		if (cen !== null)
			cen.bad = this;
		this.bad = bad;
		if (bad !== null)
			bad.cen = this;
	}

	cena(that: Link): boolean {
		return this.val < that.val || (this.val === that.val && this.index < that.index);
	}

	kopiyu(nove: Link) {
		nove.jener = this.jener; // move it here
		if (this.jener !== null) {
			if (this.jener.raitPute === this)
				this.jener.raitPute = nove;
			else
				this.jener.leftPute = nove;
		}
	}

	getaPute(left: Link, rait: Link) {
		this.leftPute = left;
		if (left !== null)
			left.jener = this;
		this.raitPute = rait;
		if (rait !== null)
			rait.jener = this;
	}
}
