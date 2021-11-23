import React from 'react'
import style from './index.css'

export default class Bar extends React.Component {
  render() {
    return (
      <>
        <style>{style}</style>
        <div className="bar">bar</div>
      </>
    )
  }
}
