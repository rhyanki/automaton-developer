class Vector {
	/**
	 * 
	 * @param {Number} x The x-coordinate, or radius if using polar.
	 * @param {Number} y The y-coordinate, or angle if using polar.
	 * @param {Boolean} [polar = false] Whether to use polar coordinates (default Euclidean).
	 */
	constructor(xOrRadius, yOrAngle, polar) {
		if (polar === undefined || !polar) {
			this.x = xOrRadius;
			this.y = yOrAngle;
		} else {
			this.x = xOrRadius * Math.cos(yOrAngle);
			this.y = xOrRadius * Math.sin(yOrAngle);
		}
		Object.freeze(this);
	}

	/**
	 * Return the midpoint between two vectors.
	 * @param {Vector} a
	 * @param {Vector} b
	 */
	static midpoint(a, b) {
		return new Vector((a.x + b.x) / 2, (a.y + b.y) / 2);
	}

	/**
	 * Return the direction/angle of the vector from (0, 0).
	 */
	angle() {
		return Math.atan2(this.y, this.x);
	}

	/**
	 * Return the angle to another vector.
	 */
	angleTo(v) {
		return v.minus(this).angle();
	}

	/**
	 * Multiply the vector by a scalar.
	 * @param {Number} s The scalar.
	 */
	by(s) {
		return new Vector(this.x * s, this.y * s);
	}

	/**
	 * Return the distance to another vector.
	 * @param {Vector} v The other vector.
	 */
	distanceTo(v) {
		return this.minus(v).length();
	}

	/**
	 * Return the length/magnitude of the vector.
	 */
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/**
	 * Return the midpoint between this vector and another.
	 * @param {Vector} v The vector to subtract.
	 */
	midpoint(v) {
		return Vector.midpoint(this, v);
	}

	/**
	 * Subtract another vector from the vector.
	 * @param {Vector} v The vector to subtract.
	 */
	minus(v) {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	/**
	 * Add the vector to another vector.
	 * @param {Vector} v The vector to add.
	 */
	plus(v) {
		return new Vector(this.x + v.x, this.y + v.y);
	}

	plusX(x) {
		return new Vector(this.x + x, this.y);
	}

	plusY(y) {
		return new Vector(this.x, this.y + y);
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
	}
}

/**
 * Normalize an angle so that -π < angle ≤ π.
 * @param {Number} angle The angle in radians.
 * @returns {Number} The normalized angle.
 */
function normalizeAngle(angle) {
	if (angle > Math.PI) {
		while (angle > Math.PI) {
			angle -= Math.PI * 2;
		}
		return angle;
	}
	while (angle <= -Math.PI) {
		angle += Math.PI * 2;
	}
	return angle;
}

/**
 * Get the point offset from a given point perpendicular to the line between two other points.
 * @param {Vector} start The start point of the line.
 * @param {Vector} end The end point of the line.
 * @param {Number} offset The amount to offset by.
 * @param {Vector} [from] The point from which to offset. Defaults to the midpoint between start and end.
 */
function perpendicularOffset(start, end, offset, from) {
	if (from === undefined) {
		from = Vector.midpoint(start, end);
	}
	const angle = start.angleTo(end) + Math.PI / 2;
	return new Vector(
		Math.floor(from.x - Math.cos(angle) * offset),
		Math.floor(from.y - Math.sin(angle) * offset)
	);
}

/**
 * Return a position on a quadratic curve at a given t value.
 * @param {Vector} start The curve's start point.
 * @param {Vector} control The curve's control point.
 * @param {Vector} end The curve's end point.
 * @param {Number} t The t value, between 0 and 1.
 * @returns {Vector} The position at the t value.
 */
function quadraticCurveAt(start, control, end, t) {
	// This is just the quadratic Bezier formula
	let ret = start.by(Math.pow(1 - t, 2));
	ret = ret.plus(control.by(2 * (1 - t) * t));
	ret = ret.plus(end.by(t * t));
	return ret;
}

export {Vector, normalizeAngle, perpendicularOffset, quadraticCurveAt};
