import Bar from './bar'
import { name } from '../../package.json'

export default class Foo extends React.Component {
  displayName = 'Foo'
  render() {
    return (
      <div>
        <Bar />
        <div className="name">{name}</div>
      </div>
    )
  }
}
