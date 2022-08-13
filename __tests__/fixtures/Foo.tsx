import Bar from './bar'
import { toUpperCase } from './lib.mjs'
import { name } from '../../package.json'

export default class Foo extends React.Component {
  displayName = 'Foo'
  render() {
    return (
      <div>
        <Bar />
        <div className="name">{toUpperCase(name)}</div>
      </div>
    )
  }
}
