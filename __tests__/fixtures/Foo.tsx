import Bar from '/Users/xuanbo/repositories/rollup-plugin-esbuild-transform/__tests__/fixtures/bar'
import { qux } from './baz.json'

export default class Foo extends React.Component {
  render() {
    return (
      <div className="bar">
        <Bar />
        <div className="qux">{qux}</div>
      </div>
    )
  }
}
