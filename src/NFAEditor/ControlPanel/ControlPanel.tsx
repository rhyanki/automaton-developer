import * as React from 'react';
import RunnableNFA from '../../Core/RunnableNFA';
import './ControlPanel.css';

interface IProps {
	nfa: RunnableNFA,
	addState: () => any,
	back: () => any,
	clear: () => any,
	editAlphabet: () => any,
	reset: () => any,
	run: () => any,
	setInput: (input: string) => any,
	stop: () => any,
	step: () => any,
};

export default class ControlPanel extends React.PureComponent<IProps> {
	render() {
		const nfa = this.props.nfa;
		return (
			<div className="ControlPanel">
				<form className="form-inline">
					<button type="button" className="btn btn-default" onClick={() => this.props.addState()}>Add State</button>
					<button type="button" className="btn btn-default" onClick={() => this.props.clear()}>Clear All</button>
					<input
						type="text"
						className="form-control"
						value={nfa.remainingInput}
						onChange={(e) => this.props.setInput(e.target.value)}
					/>
					<button
						type="button"
						className="btn btn-default"
						onClick={() => this.props.step()}
						disabled={!nfa.remainingInput}
					>
						Step
					</button>
					<button
						type="button"
						className="btn btn-default"
						onClick={() => this.props.run()}
						disabled={!nfa.remainingInput}
					>
						Run
					</button>
					<button type="button" className="btn btn-default" onClick={() => this.props.back()}>Undo</button>
					<button
						type="button"
						className="btn btn-default"
						onClick={() => this.props.stop()}
						disabled={!nfa.isRunning}
					>
						Stop
					</button>
					<label>Alphabet: </label>
					<span
						className={"click-editable" + (nfa.hasSetAlphabet ? "" : " implicit-alphabet")}
						onClick={() => this.props.editAlphabet()}
					>
						{nfa.alphabet.toString(", ", false)}
					</span>
				</form>
			</div>
		);
	}
}
