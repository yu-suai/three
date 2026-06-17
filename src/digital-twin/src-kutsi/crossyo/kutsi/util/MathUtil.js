
const ceilPowerOfTwo = v => {
	return Math.pow(2, Math.ceil(Math.log(v) / Math.log(2)));
}

// form yo-math!
const fmod = (n, p) => {
	if (n < 0)
		n = p - Math.abs(n) % p;
	return n % p;
}

// http://gizma.com/easing/
// t: current timeout
// b: start value
// c: change in value
// d: duration
const easeInQuad = (t, b, c, d) => {
	t /= d;
	return c * t * t + b;
}

const easeOutQuad = (t, b, c, d) => {
	t /= d;
	return -c * t * (t - 2) + b;
}

const easeInOutQuad = (t, b, c, d) => {
	t /= d / 2;
	if (t < 1) return c / 2 * t * t + b;
	t--;
	return -c / 2 * (t * (t - 2) - 1) + b;
}

// #20210610
// const seg_intersection = (p0, p1, p2, p3) => {
// 	var s, s1_x, s1_y, s2_x, s2_y, t;

// 	s1_x = p1.x - p0.x;
// 	s1_y = p1.y - p0.y;
// 	s2_x = p3.x - p2.x;
// 	s2_y = p3.y - p2.y;
// 	s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / (-s2_x * s1_y + s1_x * s2_y);
// 	t = (s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / (-s2_x * s1_y + s1_x * s2_y);
// 	if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
// 		return {
// 			x: p0.x + (t * s1_x),
// 			y: p0.y + (t * s1_y)
// 		};
// 	}
// 	return null;
// };

// #20220601, kiwi

class SeedRandom {

	constructor(seed) {
		this.seed_ = this.hash_(seed || 9988); // 避免种子产生规律，以及seed 0的问题
	}

	next() {
		var x = Math.sin(this.seed_++) * 10000;
		return x - Math.floor(x);
	}

	nextInt(v) {
		// var r1 = this.next();
		// var r = Math.floor(r1 * v);
		// console.log('next with seed_', this.seed_, r1, 'x', v, '=', r);
		// return r;
		return Math.floor(this.next() * v);
	}

	hash_(seed) {
		var str = ' ' + seed;
		var hash = 0,
			i, chr, len;
		if (str.length === 0) return hash;
		for (i = 0, len = str.length; i < len; i++) {
			chr = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}

}

export {
	ceilPowerOfTwo,
	fmod,
	easeInQuad,
	easeOutQuad,
	easeInOutQuad,
	SeedRandom,
}