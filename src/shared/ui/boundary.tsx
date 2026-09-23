import { type AppError, messageOf } from '../lib/appError.ts'
import { assert } from '../lib/assert.ts'
import { toAppError } from '../parse/appError.ts'
import { Component, type ReactNode } from 'react'

export const RESETS_MAX = 3
export const FALLBACK_TEXT =
  'The page cannot load. Reload the page, or try again later.'

type Level = 'root' | 'route' | 'widget'

type Props = {
  readonly children: ReactNode
  readonly level: Level
  readonly report: (error: AppError) => void
  readonly resetsMax: number
}

type State = { error: AppError | null; escalate: boolean; resets: number }

export class Boundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, escalate: false, resets: 0 }
  }

  static getDerivedStateFromError(caught: Error): Partial<State> {
    return { error: toAppError(caught, 'render') }
  }

  componentDidCatch(caught: Error): void {
    assert(this.props.level.length > 0, 'a boundary has a level')

    this.props.report(toAppError(caught, this.props.level))
  }

  handleReset = (): void => {
    assert(this.state.error !== null, 'a reset follows an error')
    assert(
      this.state.resets <= this.props.resetsMax,
      'the resets stay in the limit',
    )

    if (this.state.resets < this.props.resetsMax) {
      this.setState((state) => ({ error: null, resets: state.resets + 1 }))

      return
    }

    this.setState({ escalate: true })
  }

  render(): ReactNode {
    const { error, escalate } = this.state
    const { level, resetsMax } = this.props

    if (escalate && level === 'root') {
      return <p role="alert">{FALLBACK_TEXT}</p>
    }

    if (escalate) {
      throw new Error(`the ${level} boundary passed ${resetsMax} resets`)
    }

    if (error === null) {
      return this.props.children
    }

    return (
      <div role="alert">
        <p>{messageOf(error.code)}</p>
        <button
          onClick={this.handleReset}
          type="button"
        >
          Retry
        </button>
      </div>
    )
  }
}
