import * as React from 'react';
import NFA, {State} from '../../Core/NFA';
import './TransitionList.css';

interface IProps {
	nfa: NFA,
	state: State,
	promptUpdateTransitionSymbols: (state: State, target: State) => any,
	updateTransitionTarget: (origin: State, oldTarget: State, newTarget: State) => any,
};

class TransitionList extends React.PureComponent<IProps> {
	render() {
		const rows = [];
		const nfa = this.props.nfa;
		const state = this.props.state;
		const sortedTransitions = [...nfa.transitionsFrom(state)].sort((a, b) => a[0] - b[0]);
		for (const [target, symbols] of sortedTransitions) {
			const opts = [];
			for (const opt of nfa.states) {
				opts.push(
					<option key={opt} value={opt}>{nfa.name(opt)}</option>
				);
			}
			rows.push((
				<tr key={target} className="transition-row">
					<td>
						<span className="click-editable" onClick={() => this.props.promptUpdateTransitionSymbols(state, target)}>
							{symbols.toString()}
						</span>
					</td>
					<td>
						<select
							className="form-control transition-target"
							onChange={(e) => this.props.updateTransitionTarget(state, target, Number(e.target.value))}
							value={target}
						>
							{opts}
						</select>
					</td>
				</tr>
			));
		}
		return (
			<table className="TransitionList" style={{width: '100%'}}>
				<colgroup>
					<col span={1} style={{width: '30%'}} />
					<col span={1} style={{width: '70%'}} />
				</colgroup>
				<tbody>{rows}</tbody>
			</table>
		);
	}
}

export default TransitionList;
