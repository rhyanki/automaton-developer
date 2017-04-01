import React, { Component } from 'react';
import {copy, freeze} from '../util.js';
import TransitionList from './TransitionList.js';
import './StateList.css';

class StateList extends Component {
	constructor(props) {
		super(props);

		this.handleMoveStateDown = this.handleMoveStateDown.bind(this);
		this.handleMoveStateUp = this.handleMoveStateUp.bind(this);

		this.state = {
			order: [...this.props.dfa.states()]
		}
		freeze(this.state.order);
	}

	handleMoveStateDown(id) {
		this.moveState(id, 1);
	}

	handleMoveStateUp(id) {
		this.moveState(id, -1);
	}

	moveState(id, inc) {
		id = Number(id);
		this.setState((state, props) => {
			// Perform the swap
			let pos1 = state.order.indexOf(id);
			let pos2 = pos1 + inc;
			if (pos1 === -1 || pos2 < 0 || pos2 >= state.order.length) {
				return;
			}
			let order = copy(state.order);
			order[pos1] = order[pos2];
			order[pos2] = id;
			return {
				order: order
			}
		});
	}

	render() {
		const dfa = this.props.dfa;
		console.log("DFA updated");
		console.log(dfa);
		const rows = this.state.order.map((state) => {
			return <tr key={state} className={'state ' + (!dfa.reachable(state) ? 'state-unreachable ' : '') + (dfa.accept(state) ? 'state-accept ' : '') + (!dfa.generating(state) ? 'state-nongenerating ' : '')}>
				<td>
					<button onClick={() => this.handleMoveStateUp(state)}><i className="fa fa-chevron-up"></i></button>
					<button onClick={() => this.handleMoveStateDown(state)}><i className="fa fa-chevron-down"></i></button>
				</td>
				<td><input name="start" type="radio" onChange={() => this.props.handleUpdateStart(state)} checked={dfa.start(state)} /></td>
				<td>{state}</td>
				<td><input type="text" className="form-control" value={dfa.name(state)} onChange={(e) => this.props.handleUpdateStateName(state, e.target.value)} /></td>
				<td>
					<TransitionList dfa={dfa} state={state}
					handleUpdateTransitionTarget={this.props.handleUpdateTransitionTarget}
					promptUpdateTransitionSymbols={this.props.promptUpdateTransitionSymbols} />
				</td>
				<td>
					<input type="checkbox" onChange={(e) => this.props.handleUpdateAccept(state, e.target.checked)} checked={dfa.accept(state)} />
				</td>
			</tr>;
		});
		return (
			<div>
				<table className="form-inline table">
					<colgroup>
						<col span="1" style={{width: "5%"}} />
						<col span="1" style={{width: "5%"}} />
						<col span="1" style={{width: "5%"}} />
						<col span="1" style={{width: "30%"}} />
						<col span="1" style={{width: "50%"}} />
						<col span="1" style={{width: "5%"}} />
					</colgroup>
					<thead><tr>
						<th>Move</th>
						<th>Start</th>
						<th>ID</th>
						<th>Name</th>
						<th>Symbol > Target</th>
						<th>Accept</th>
					</tr></thead>
					<tbody>{rows}</tbody>
				</table>
				<span className="state-unreachable">Unreachable</span>,&nbsp;
				<span className="state-nongenerating">Non-generating</span>,&nbsp;
				<span className="state-accept">Accept</span>
			</div>
		);
	}
}

export default StateList;
