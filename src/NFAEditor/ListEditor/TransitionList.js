import React, { Component } from 'react';
import './TransitionList.css';

class TransitionList extends Component {
	render() {
		let rows = [];
		const nfa = this.props.nfa;
		const state = this.props.state;
		const sortedTransitions = [...nfa.transitions(state)].sort((a, b) => a[0] - b[0]);
		for (const [target, symbols] of sortedTransitions) {
			let opts = [];
			for (const opt of nfa.states()) {
				opts.push(
					<option key={opt} value={opt}>{nfa.name(opt)}</option>
				);
			}
			rows.push(<tr key={target} className="transition-row">
				<td>
					<span className="click-editable" onClick={() => this.props.promptUpdateTransitionSymbols(state, target)}>
						{symbols.toString()}
					</span>
				</td>
				<td>
					<select className="form-control transition-target" onChange={(e) => this.props.handleUpdateTransitionTarget(state, target, e.target.value)} value={target}>
						{opts}
					</select>
				</td>
			</tr>);
		}
		return (
			<table className="TransitionList" style={{width: "100%"}}>
				<colgroup>
					<col span="1" style={{width: "30%"}} />
					<col span="1" style={{width: "70%"}} />
				</colgroup>
				<tbody>{rows}</tbody>
			</table>
		);
	}
}

export default TransitionList;
