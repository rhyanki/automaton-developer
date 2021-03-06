import * as React from 'react';
import {Vector, normalizeAngle, perpendicularOffset, quadraticCurveAt} from '../../Util/math';
import {defaults} from '../../Util/general';

interface IProps {
	/** The t value (t from 0 to 1) at which to draw the arrowhead. */
	arrowHeadT?: number,
	/** The classname for the main <g>. */
	className?: string,
	/** The control point (defaults to the midpoint of start and end - i.e., a straight line). */
	control?: Vector,
	/** The end position. */
	end: Vector,
	/** The label text. */
	label?: string,
	/** Handler for when the label is clicked. */
	onClickLabel?: React.EventHandler<React.MouseEvent<any>>,
	/** Handler for when the shaft is clicked. */
	onClickShaft?: React.EventHandler<React.MouseEvent<any>>,
	/** If provided, the arrow will be an arc from start to end with the given radius. */
	radius?: number,
	/** The start position. */
	start: Vector,
};

/**
 * Renders a labelled, directed, clickable, arrow between two points, with the label rendered in the centre.
 * The arrow may be a straight line, a quadratic curve (if control provided), or an arc (if radius provided).
 */
class LabelledArrow extends React.PureComponent<IProps> {
	/**
	 * Return a polyline consisting of two short lines in the shape of an arrowhead.
	 * @param pos The position of the tip of the arrow.
	 * @param angle The angle at which the arrow is pointing. 0 = left, π/2 = down.
	 * @param size The length of each line.
	 * @param theta The angle between the arrow's lines. Should be less than π.
	 */
	renderArrowHead(pos: Vector, angle: number, size: number = 10, theta: number = Math.PI / 3) {
		const t1 = angle - theta / 2;
		const t2 = angle + theta / 2;

		let points = "" + (pos.x - size * Math.cos(t1)) + "," + (pos.y - size * Math.sin(t1));
		points += " " + pos.x + "," + pos.y;
		points += " " + (pos.x - size * Math.cos(t2)) + "," + (pos.y - size * Math.sin(t2));

		return (<polyline className="head" points={points} />);
	}

	render() {
		const start = this.props.start;
		const end = this.props.end;

		const def = {
			arrowHeadT: 1,
			className: "LabelledArrow",
			control: Vector.midpoint(start, end),
			label: "",
		};
		const props = defaults(this.props, def, false);

		// The SVG string to draw the curve
		let d = "M" + start.x + " " + start.y;
		let arrowHead;
		let labelAnchor;
		let labelPos;

		if (props.radius !== undefined) {
			// Arc
			const r = props.radius;

			d += " A " + r + " " + r + " 0 1 1 " + end.x + " " + end.y;

			// Angle normal to the arc
			const normal = normalizeAngle(start.angleTo(end) - Math.PI / 2);

			// For now, place the label so that it is guaranteed not to overlap with the shaft.
			// But this is crude, we should calculate the actual "diameter" of the arc.
			labelPos = perpendicularOffset(start, end, r * 2.2);

			if (Math.abs(normal) > Math.PI / 2) {
				labelAnchor = "end";
			} else {
				labelAnchor = "start";
			}

			// Calculate the angle of the arrowhead ...
			// Basically, we know the two arc points, and the radius.
			// Draw a triangle between the two arc points and the arc center, and call the two equal angles theta.
			// Then theta we can see is perpendicular to the gradient of the arc at the end point
			// (assuming the triangle's base is along the x-axis).
			// Then just add the angle of the normal to compensate.
			// Let d = d between arc points, then
			// 2 r cos θ = d
			// So θ = acos(d / 2r)
			// Then arrowAngle = -π/2 - θ + normal = -π/2 - acos(d / 2r) + normal.
			const dist = start.distanceTo(end);
			const arrowAngle = -Math.PI / 2 - Math.acos(dist / (2 * r)) + normal;
			arrowHead = this.renderArrowHead(end, arrowAngle);
		} else {
			// Quadratic curve or straight line
			const control = props.control;

			d += " Q " + control.x + " " + control.y + ", " + end.x + " " + end.y;

			// Place the label at the center of the arrow, slightly offset.
			labelPos = perpendicularOffset(start, end, 10, quadraticCurveAt(start, control, end, 0.5));

			// Determine whether the label should be anchored left or right.
			const angle = start.angleTo(end);
			if (normalizeAngle(angle) > 0) {
				labelAnchor = "start";
			} else {
				labelAnchor = "end";
			}

			const arrowHeadPos = quadraticCurveAt(start, control, end, props.arrowHeadT);
			arrowHead = this.renderArrowHead(arrowHeadPos, angle); // TODO: make the angle more accurate
		}

		return (
			<g
				className={props.className}
			>
				<g className="arrow">
					<path className="shaft" d={d} onClick={props.onClickShaft} />
					{arrowHead}
				</g>
				{props.label ? (
					<text
						className="label"
						x={labelPos.x}
						y={labelPos.y + 5}
						textAnchor={labelAnchor}
						onClick={props.onClickLabel}
					>
						{props.label}
					</text>
				) : null}
			</g>
		);
	}
}

export default LabelledArrow;
