import React, { Component } from 'react';
import './VisualEditor.css';

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

class VisualEditor extends Component {
	constructor(props) {
		super(props);

		this.width = 600; // Placeholders
		this.height = 600;

		this.STATE_RADIUS = 50;
		this.NAME_SIZE = 14;

		this.dragging = 0; // The state currently being dragged
		this.dragPos = null;

		this.state = {
			positions: new Map(),
		};
	}

	componentDidMount() {
		this.resetPositions();
	}

	componentDidUpdate() {
		//this.drawTransitions();
	}

	startDragging(e, state) {
		this.dragging = state;
		this.dragPos = new Vector(e.clientX, e.clientY);
	}

	maybeDrag(e) {
		if (!this.dragging) {
			return;
		}
		const newDragPos = new Vector(e.clientX, e.clientY);
		const diff = newDragPos.minus(this.dragPos);
		this.setState((state, props) => {
			const newPositions = new Map(state.positions);
			const oldPos = state.positions.get(this.dragging);
			const newPos = oldPos.plus(diff);
			newPositions.set(this.dragging, newPos);
			return {
				positions: newPositions,
			};
		});
		this.dragPos = newDragPos;
	}

	stopDragging() {
		// When the mouse is up, stop dragging
		this.dragging = 0;
	}

	// Return a control point, which is offset perpendicularly from the midpoint of two points.
	controlPoint(start, end, offset) {
		const mid = start.midpoint(end);
		let angle = start.angleTo(end);
		angle += Math.PI / 2; // Now make it perpendicular
		return new Vector(
			Math.floor(mid.x - Math.cos(angle) * offset),
			Math.floor(mid.y - Math.sin(angle) * offset)
		);
	}

	normalizeAngle(angle) {
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

	// Return a position on a quadratic curve at a given t value
	quadraticCurveAt(start, control, end, t) {
		// This is just the quadratic Bezier formula
		let ret = start.by(Math.pow(1 - t, 2));
		ret = ret.plus(control.by(2 * (1 - t) * t));
		ret = ret.plus(end.by(t * t));
		return ret;
	}

	promptEditState(state) {
		if (this.state.dragging) {
			return;
		}
		const newName = window.prompt("Enter a state name.", this.props.dfa.name(state));
		if (newName) {
			this.props.handleUpdateStateName(state, newName);
		}
	}

	resetPositions() {
		this.setState((state, props) => {
			const positions = new Map(); // Stores the positions of each state
			const numStates = props.dfa.numStates;

			let angle = Math.PI; // The angle at which the next state should be placed
			const offset = Math.min(this.width, this.height) * 0.3; // The distance each state should start from the centre
			const direction = -1; // -1 for clockwise, 1 for anticlockwise

			for (const state of props.dfa.states()) {
				const x = Math.round(this.width * 0.5 + Math.cos(angle) * offset);
				const y = Math.round(this.height * 0.5 - Math.sin(angle) * offset);
				positions.set(state, new Vector(x, y));
				angle += Math.PI * 2 / numStates * direction;
			}
			return {positions: positions};
		});
	}

	x(state) {
		return this.state.positions.get(state).x;
	}

	y(state) {
		return this.state.positions.get(state).y;
	}

	pos(state) {
		return this.state.positions.get(state);
	}

	/**
	 * Return a polyline consisting of two short lines in the shape of an arrowhead.
	 * @param {Vector} pos The position of the tip of the arrow.
	 * @param {Number} angle The angle at which the arrow is pointing. 0 = left, pi / 2 = down.
	 * @param {Number} size The length of each line.
	 * @param {Number} theta The angle between the arrow's lines. Should be less than pi.
	 */
	renderArrowHead(pos, angle, size, theta) {
		const t1 = angle - theta / 2;
		const t2 = angle + theta / 2;

		let points = "" + (pos.x - size * Math.cos(t1)) + "," + (pos.y - size * Math.sin(t1));
		points += " " + pos.x + "," + pos.y;
		points += " " + (pos.x - size * Math.cos(t2)) + "," + (pos.y - size * Math.sin(t2));

		return <polyline className="head" points={points} />
	}

	/**
	 * Return an array of SVG groups for all transitions from a state.
	 */
	renderTransitions() {
		const dfa = this.props.dfa;
		const output = [];
		const angles = new Map(); // List of angles around the state's circle at which each transition arrow leaves

		const ARROW_HEAD_SIZE = 10;
		const ARROW_HEAD_ANGLE = Math.PI / 3;

		for (const state of this.state.positions.keys()) {
			angles.set(state, []);
		};

		for (const [origin, originPos] of this.state.positions) {
			for (const [target, symbols] of dfa.transitions(origin)) {
				if (origin === target) {
					// Will need to make special case for self-connections
					continue;
				}

				const targetPos = this.pos(target);

				// Don't bother rendering if the states are overlapping
				const dist = originPos.distanceTo(targetPos);
				if (dist < this.STATE_RADIUS) {
					continue;
				}

				let d = "M" + originPos.x + " " + originPos.y;

				let control;
				let symbolsPos;

				// If there is a two-way connection, draw curved lines
				if (dfa.transition(target, origin)) {
					control = this.controlPoint(originPos, targetPos, 30);
					d += " Q " + control.x + " " + control.y + ", " + targetPos.x + " " + targetPos.y;
					symbolsPos = this.controlPoint(originPos, targetPos, 25);
				} else {
					d += " L " + targetPos.x + " " + targetPos.y;
					control = originPos.midpoint(targetPos);
					symbolsPos = this.controlPoint(originPos, targetPos, 10);
				}

				const angle = originPos.angleTo(targetPos);

				const targetIntersectPos = this.quadraticCurveAt(originPos, control, targetPos, 1 - this.STATE_RADIUS / dist);
				const arrowHead = this.renderArrowHead(targetIntersectPos, angle, ARROW_HEAD_SIZE, ARROW_HEAD_ANGLE);

				if (dfa.transition(target, target)) {
					angles.get(target).push(targetPos.angleTo(targetIntersectPos));
				}

				// Push the angle around the state circle from which the transition arrow protrudes
				const originIntersectPos = this.quadraticCurveAt(originPos, control, targetPos, this.STATE_RADIUS / dist);
				if (dfa.transition(origin, origin)) {
					angles.get(origin).push(originPos.angleTo(originIntersectPos));
				}

				let textAnchor;
				if (this.normalizeAngle(angle) > 0) {
					textAnchor = "start";
				} else {
					textAnchor = "end";
				}

				output.push(<g
					key={[origin, target]}
					className="transition"
				>
					<g className="arrow">
						<path className="shaft" d={d} />;
						{arrowHead}
					</g>
					<text
						className="symbol"
						x={symbolsPos.x}
						y={symbolsPos.y + 5}
						textAnchor={textAnchor}
						onClick={() => this.props.promptUpdateTransitionSymbols(origin, target)}
					>{symbols.toString()}</text>
				</g>);
			}
		}

		for (const state of this.state.positions.keys()) {
			if (dfa.transition(state, state)) {
				const pos = this.pos(state);
				let angs = angles.get(state);

				let angle;

				if (angs.length === 0) {
					angle = - Math.PI / 2;
				} else if (angs.length === 1) {
					// If there is just one arrow, put the self-arrow on the opposite side
					angle = angs[0] + Math.PI;
				} else {
					// Otherwise, we want to put the transition wherever there is the largest gap between two other arrows.
					angs.sort((a, b) => a - b);
					// The loop will get every angle difference except from the last to the first
					let max = Math.PI * 2 + angs[0] - angs[angs.length - 1];
					angle = (Math.PI * 2 + angs[0] + angs[angs.length - 1]) / 2;
					for (let i = 0; i < angs.length - 1; i++) {
						const diff = angs[i + 1] - angs[i];
						if (diff > max) {
							max = diff;
							angle = (angs[i + 1] + angs[i]) / 2;
						}
					}
				}

				const r = this.STATE_RADIUS * 0.4; // The radius of the arc to draw
				const theta = Math.PI / 6; // The desired angle between the two intersection points of the arc with the state circle
				const aStart = angle - theta / 2;
				const aEnd = angle + theta / 2;
				const start = pos.plus(new Vector(this.STATE_RADIUS, aStart, true));
				const end = pos.plus(new Vector(this.STATE_RADIUS, aEnd, true));

				let d = "M" + start.x + " " + start.y + " A " + r + " " + r + " 0 1 1 " + end.x + " " + end.y;
				const symbols = dfa.symbols(state, state);
				const symbolsPos = pos.plus(new Vector(this.STATE_RADIUS + r * 2.1, angle, true));

				let textAnchor;
				if (Math.abs(this.normalizeAngle(angle)) > Math.PI / 2) {
					textAnchor = "end";
				} else {
					textAnchor = "start";
				}

				// Calculate the angle of the arrowhead ...
				// Basically, we know the two arc points, and the radius.
				// Draw a triangle between the two arc points and the arc center, and call the two equal angles theta.
				// Then theta we can see is perpendicular to the gradient of the arc at the end point (assuming the triangle is directly above the main circle)
				// Then just add the angle from the main circle center to the arc center.
				// Let d = d between arc points, then
				// 2 r cos θ = d
				// So θ = acos(d / 2r)
				// Then arrowAngle = -π/2 - θ + angle = -π/2 - acos(d / 2r) + angle.
				const dist = start.distanceTo(end);
				const arrowAngle = -Math.PI / 2 - Math.acos(dist / (2 * r)) + angle;

				const arrowHead = this.renderArrowHead(end, arrowAngle, ARROW_HEAD_SIZE, ARROW_HEAD_ANGLE);

				output.push(<g
					key={[state, state]}
					className="transition"
				>
					<g className="arrow">
						<path className="shaft" d={d} />
						{arrowHead}
					</g>
					<text
						className="symbol"
						x={symbolsPos.x}
						y={symbolsPos.y + 5}
						textAnchor={textAnchor}
						onClick={() => this.props.promptUpdateTransitionSymbols(state, state)}
					>{symbols.toString()}</text>
				</g>);
			}
		}

		return output;
	}

	render() {
		const states = [];
		const dfa = this.props.dfa;
		for (const [state, pos] of this.state.positions) {
			states.push(<g
				key={state}
				transform={"translate(" + pos.x + ", " + pos.y + ")"}
				onMouseDown={(e) => {this.startDragging(e, state)}}
				className={'state ' + (!dfa.reachable(state) ? 'state-unreachable ' : '') + (dfa.accept(state) ? 'state-accept ' : '') + (!dfa.generating(state) ? 'state-nongenerating ' : '')}
				draggable={false}
				onDragStart={() => {return false;}}
			>
				<circle
					name={state}
					style={{stroke: "black", strokeWidth: 1}}
					r={this.STATE_RADIUS}
				/>
				<foreignObject
					x={-0.5 * this.STATE_RADIUS}
					y={0.4 * this.STATE_RADIUS}
					width={this.STATE_RADIUS}
					height={this.STATE_RADIUS}
				>
					<i
						className="fa fa-pencil btn-edit-state"
						onClick={() => this.promptEditState(state)}
					></i>
					<i
						className="fa fa-check btn-edit-state"
						onClick={() => this.props.handleToggleAccept(state)}
					></i>
				</foreignObject>
				<text
					fontFamily="Verdana"
					x={0}
					y={0}
					textAnchor="middle"
				>{dfa.name(state)}</text>
			</g>);
		}

		return (
			<svg
				ref="svg"
				className="VisualEditor"
				width={this.width}
				height={this.height}
				onMouseMove={(e) => {this.maybeDrag(e)}}
				onMouseLeave={() => {this.stopDragging()}}
				onMouseUp={() => {this.stopDragging()}}
			>
				{this.renderTransitions()}
				{states}
			</svg>
		);
	}
}

export default VisualEditor;
