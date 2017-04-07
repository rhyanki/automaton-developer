import React, { Component } from 'react';
import {copy, freeze} from '../../Util/immutability.js';
import TransitionList from './TransitionList.js';
import './ListEditor.css';

class ListEditor extends Component {
	constructor(props) {
		super(props);

		this.handleMoveStateDown = this.handleMoveStateDown.bind(this);
		this.handleMoveStateUp = this.handleMoveStateUp.bind(this);

		this.state = {
			order: [...this.props.nfa.states()]
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
		const nfa = this.props.nfa;
		const rows = this.state.order.map((state) => {
			return <tr key={state} className={'state ' + (!nfa.reachable(state) ? 'state-unreachable ' : '') + (nfa.accept(state) ? 'state-accept ' : '') + (!nfa.generating(state) ? 'state-nongenerating ' : '')}>
				<td>
					<button onClick={() => this.handleMoveStateUp(state)}><i className="fa fa-chevron-up"></i></button>
					<button onClick={() => this.handleMoveStateDown(state)}><i className="fa fa-chevron-down"></i></button>
				</td>
				<td><input name="start" type="radio" onChange={() => this.props.updateStart(state)} checked={nfa.start(state)} /></td>
				<td>{state}</td>
				<td><input type="text" className="form-control" value={nfa.name(state)} onChange={(e) => this.props.updateStateName(state, e.target.value)} /></td>
				<td>
					<TransitionList nfa={nfa} state={state}
					handleUpdateTransitionTarget={this.props.updateTransitionTarget}
					promptUpdateTransitionSymbols={this.props.promptUpdateTransitionSymbols} />
				</td>
				<td>
					<input type="checkbox" onChange={(e) => this.props.updateAccept(state, e.target.checked)} checked={nfa.accept(state)} />
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

export default ListEditor;
