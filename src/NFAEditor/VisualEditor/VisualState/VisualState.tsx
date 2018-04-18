import * as React from 'react';
import RunnableNFA, {State} from '../../../Core/RunnableNFA';
import './VisualState.css';

interface IProps {
	nfa: RunnableNFA,
	state: State,
	radius: number,
	onMouseDown: React.EventHandler<React.MouseEvent<SVGGElement>>,
	onMouseEnter: React.EventHandler<React.MouseEvent<SVGGElement>>,
	onMouseLeave: React.EventHandler<React.MouseEvent<SVGGElement>>,
	promptEditName: () => any,
	remove: () => any,
	setStart: () => any,
	toggleAccept: () => any,
};

export default class VisualState extends React.PureComponent<IProps> {
	render() {
		const nfa = this.props.nfa;
		const state = this.props.state;
		return (
			<g
				onMouseDown={this.props.onMouseDown}
				onMouseEnter={this.props.onMouseEnter}
				onMouseLeave={this.props.onMouseLeave}
				className={'VisualState state'
					+ (!nfa.reachable(state) ? ' unreachable' : '')
					+ (nfa.isAccept(state) ? ' accept' : '')
					+ (!nfa.generating(state) ? ' nongenerating' : '')
					+ (nfa.isCurrentState(state) ? ' current' : '')
				}
				onDragStart={() => false}
			>
				<circle
					style={{stroke: "black", strokeWidth: 1}}
					r={this.props.radius}
				/>
				<foreignObject
					x={-0.5 * this.props.radius}
					y={-0.8 * this.props.radius}
					width={this.props.radius}
					height={this.props.radius * 0.5}
				>
					<i
						className={"fa fa-flag-checkered" + (!nfa.isStart(state) ? " btn-edit" : "")}
						title={!nfa.isStart(state) ? "Set as start" : undefined}
						onClick={() => {if (!nfa.isStart(state)) { this.props.setStart(); } }}
					/>
				</foreignObject>
				<foreignObject
					x={-0.5 * this.props.radius}
					y={0.4 * this.props.radius}
					width={this.props.radius}
					height={this.props.radius * 0.5}
				>
					<i
						className="fa fa-pencil btn-edit"
						title="Edit name"
						onClick={() => this.props.promptEditName()}
					/>
					<i
						className="fa fa-remove btn-edit"
						title="Delete"
						onClick={() => this.props.remove()}
					/>
					<i
						className="fa fa-check btn-edit"
						title={nfa.isAccept(state) ? "Remove accept state" : "Make accept state"}
						onClick={() => this.props.toggleAccept()}
					/>
				</foreignObject>
				<text
					fontFamily="Verdana"
					x={0}
					y={0}
					textAnchor="middle"
				>
					{nfa.name(state)}
				</text>
			</g>
		);
	}
}