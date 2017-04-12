class Vector {
	x: number;
	y: number;

	/**
	 * Return the midpoint between two vectors.
	 */
	static midpoint(a: Vector, b: Vector) {
		return new Vector((a.x + b.x) / 2, (a.y + b.y) / 2);
	}

	/**
	 * 
	 * @param x  The x-coordinate, or radius if using polar.
	 * @param y  The y-coordinate, or angle if using polar.
	 * @param polar  Whether to use polar coordinates.
	 */
	constructor(xOrRadius: number, yOrAngle: number, polar: boolean = false) {
		if (!polar) {
			this.x = xOrRadius;
			this.y = yOrAngle;
		} else {
			this.x = xOrRadius * Math.cos(yOrAngle);
			this.y = xOrRadius * Math.sin(yOrAngle);
		}
		Object.freeze(this);
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
	angleTo(v: Vector) {
		return v.minus(this).angle();
	}

	/**
	 * Multiply the vector by a scalar.
	 */
	by(s: number) {
		return new Vector(this.x * s, this.y * s);
	}

	/**
	 * Return the distance to another vector.
	 */
	distanceTo(v: Vector) {
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
	 */
	midpoint(v: Vector): Vector {
		return Vector.midpoint(this, v);
	}

	/**
	 * Subtract another vector from the vector.
	 */
	minus(v: Vector): Vector {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	/**
	 * Add the vector to another vector.
	 */
	plus(v: Vector): Vector {
		return new Vector(this.x + v.x, this.y + v.y);
	}

	plusX(x: number): Vector {
		return new Vector(this.x + x, this.y);
	}

	plusY(y: number): Vector {
		return new Vector(this.x, this.y + y);
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
	}
}

/**
 * Normalize an angle so that -π < angle ≤ π.
 */
function normalizeAngle(angle: number): number {
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
 * @param start  The start point of the line.
 * @param end  The end point of the line.
 * @param offset  The amount to offset by.
 * @param from  The point from which to offset. Defaults to the midpoint between start and end.
 */
function perpendicularOffset(start: Vector, end: Vector, offset: number, from?: Vector) {
	if (from === undefined) {
		from = Vector.midpoint(start, end);
	}
	const angle = start.angleTo(end) + Math.PI / 2;
	return new Vector(
		Math.floor(from.x - Math.cos(angle) * offset),
		Math.floor(from.y - Math.sin(angle) * offset),
	);
}

/**
 * Return a position on a quadratic curve at a given t value.
 * @param start  The curve's start point.
 * @param control  The curve's control point.
 * @param end  The curve's end point.
 * @param t  The t value, between 0 and 1.
 */
function quadraticCurveAt(start: Vector, control: Vector, end: Vector, t: number) {
	// This is just the quadratic Bezier formula
	let ret = start.by(Math.pow(1 - t, 2));
	ret = ret.plus(control.by(2 * (1 - t) * t));
	ret = ret.plus(end.by(t * t));
	return ret;
}

export {Vector, normalizeAngle, perpendicularOffset, quadraticCurveAt};
