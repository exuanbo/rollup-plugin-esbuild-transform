import React from 'react'
import style from './index.css'
import { qux } from '../baz.json'

export default class Bar extends React.Component {
  render() {
    return (
      <>
        <style>{style}</style>
        <div className="qux">{qux}</div>
      </>
    )
  }
}
