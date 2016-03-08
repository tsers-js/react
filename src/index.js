import {Observable as O} from "rx"
import React from "react"

const h = React.createElement

const events = (dom$, selector, name) =>    // eslint-disable-line
  O.never()


export default rootElem => () => ({
  transforms: {
    React,
    h,
    events
  },
  executor: dom$ => dom$.subscribe(vnode => {
    console.log("TODO: render", vnode, "to", rootElem)   // eslint-disable-line
  })
})
