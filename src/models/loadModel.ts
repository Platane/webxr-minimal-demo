export const loadModel = (
	name:
		| "rice_ball"
		| "sushi_egg"
		| "sushi_salmon"
		| "donut_chocolate"
		| "donut_sprinkles"
		| "cookie"
		| "cookie_chocolate",
) =>
	Promise.all(
		["colors", "normals", "positions"].map((buffer) =>
			fetch(new URL(`./${name}/${buffer}.bin?url`, import.meta.url))
				.then((res) => res.arrayBuffer())
				.then((ab) => new Float32Array(ab)),
		),
	).then(([colors, normals, positions]) => ({ colors, normals, positions }));
