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
		return new Vector((this.x + v.x) / 2, (this.y + v.y) / 2)
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

export default Vector;
