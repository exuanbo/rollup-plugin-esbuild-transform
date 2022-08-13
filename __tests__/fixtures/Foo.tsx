import Bar from './bar'
import { toUpperCase } from './lib.mjs'
import { name } from '../../package.json'

const Foo = () => (
  <div>
    <Bar />
    <div className="name">{toUpperCase(name)}</div>
  </div>
)

export default Foo
