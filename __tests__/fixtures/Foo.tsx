// @ts-expect-error
import Bar from './bar'

export default class Foo {
  render() {
    // @ts-expect-error
    return <div className="bar"><Bar /></div>
  }
}
