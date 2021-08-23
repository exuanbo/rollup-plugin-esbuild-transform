/* eslint-disable */

import style from "./index.css";
import { qux } from "../baz.json";

export default class Bar {
  render() {
    // @ts-expect-error
    return (
      <>
        <style>{style}</style>
        <div className="qux">{qux}</div>
      </>
    )
  }
}
