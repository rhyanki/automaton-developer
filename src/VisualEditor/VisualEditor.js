import React, { Component } from 'react';
import './VisualEditor.css';

class Pos {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		Object.freeze(this);
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

		this.state = {
			dragging: false,
			positions: new Map(),
		};

		this.onDragState = this.onDragState.bind(this);
		this.onDropState = this.onDropState.bind(this);
	}

	componentDidMount() {
		this.resetPositions();
	}

	componentDidUpdate() {
		this.drawTransitions();
		window.$(this.refs.main).children(".state").draggable({
			drag: this.onDragState,
			stop: this.onDropState
		});
	}

	onDragState(e) {
		let $state = window.$(e.target);
		let id = Number($state.attr('name'));
		let pos = new Pos($state.position().left, $state.position().top);
		this.setState((state, props) => {
			let newPositions = new Map(state.positions);
			newPositions.set(id, pos);
			return {
				dragging: true,
				positions: newPositions
			};
		});
	}

	onDropState(e) {
		this.setState({dragging: false});
	}

	drawTransitions() {
		let ctx = this.refs.canvas.getContext('2d');
		let dfa = this.props.dfa;
		ctx.strokeStyle="#FF0000";
		ctx.lineWidth = 1;
		ctx.clearRect(0, 0, this.refs.canvas.width, this.refs.canvas.height);
		for (const state of this.props.dfa.states()) {
			ctx.beginPath();
			let start = this.state.positions.get(state);
			for (const [target,] of dfa.transitions(state)) {
				ctx.moveTo(...start);
				if (state === target) {
					// Will need to make special case for self-connections
					continue;
				}
				let end = this.state.positions.get(target);

				// If there is a two-way connection, draw curved lines
				if (dfa.transition(target, state)) {
					// Get the angle of the line
					let angle = Math.atan2((end.y - start.y), (end.x - start.x));
					angle += Math.PI / 2; // Now make it perpendicular
					let midX = (end.x + start.x) / 2;
					let midY = (end.y + start.y) / 2;
					let offset = 30; // How much to offset the control point by from the centre of the line
					let controlX = Math.floor(midX - Math.cos(angle) * offset);
					let controlY = Math.floor(midY - Math.sin(angle) * offset);
					ctx.quadraticCurveTo(controlX, controlY, ...end);
				} else {
					ctx.lineTo(...end);
				}
				
				//console.log("State " + id + " to " + target + ": Start (" + startX + ", " + startY + "), mid(" + midX + ", " + midY + "), control (" + controlX + ", " + controlY + "), end (" + endX + ", " + endY + ")")
				
				ctx.stroke();
			}
		}
	}

	promptEditState(state) {
		if (this.state.dragging) {
			return;
		}
		let newName = window.prompt("Enter a state name.", this.props.dfa.name(state));
		if (newName) {
			this.props.handleUpdateStateName(state, newName);
		}
	}

	resetPositions() {
		this.setState((state, props) => {
			let positions = new Map(); // Stores the positions of each state
			let numStates = props.dfa.numStates;

			let offset = this.width * 0.3; // The distance each state should start from the centre
			let angle = Math.PI; // The angle at which the first state should be placed
			let direction = -1; // -1 for clockwise, 1 for anticlockwise

			for (const state of props.dfa.states()) {
				let x = Math.round(this.width / 2 + Math.cos(angle) * offset);
				let y = Math.round(this.height / 2 - Math.sin(angle) * offset);
				positions.set(state, new Pos(x, y));
				angle += Math.PI * 2 / numStates * direction;
			}
			return {positions: positions};
		});
	}

	render() {
		let states = [];
		let dfa = this.props.dfa;
		for (const [state, pos] of this.state.positions) {
			states.push(<span
				key={state}
				name={state}
				style={{left: pos.x, top: pos.y}}
				className={'state ' + (!dfa.reachable(state) ? 'state-unreachable ' : '') + (dfa.accept(state) ? 'state-accept ' : '') + (!dfa.generating(state) ? 'state-nongenerating ' : '')}>
					<input type="checkbox" onChange={(e) => this.props.handleUpdateAccept(state, e.target.checked)} checked={dfa.accept(state)} />
					&nbsp;
					<span className="click-editable" onClick={(e) => this.promptEditState(state)}>{dfa.name(state)}</span>
			</span>);
		}
		return (
			<div ref="main" className="VisualEditor" style={{width: this.width, height: this.height}}>
				<canvas ref="canvas" width={this.width} height={this.height}></canvas>
				{states}
			</div>
		);
	}
}

export default VisualEditor;
