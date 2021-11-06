// @ts-expect-error
import Bar from './bar'
// @ts-expect-error
import { utils } from './lib.mts'

export default class Foo {
  private foo: string

  constructor() {
    this.foo = utils.foo()
  }

  render() {
    // @ts-expect-error
    return <div className="bar">{this.foo}<Bar /></div>
  }
}
