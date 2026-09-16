import { Component } from 'react'
import { INTERIOR, img } from '@/data/images'

export function SceneFallback() {
  return <div className="ceramic-stage"><img src={img(INTERIOR[0])} alt="Keramika bilan bezatilgan makon" className="h-full w-full object-cover" /></div>
}

export default class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <SceneFallback /> : this.props.children }
}
