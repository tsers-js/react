import {Observable as O} from "rx"
import React from "react"
import DOM from "react-dom"
import h from "react-hyperscript"
import selmatch from "matches-selector"


const zipObj = pairs => {
  const o = {}
  pairs.forEach(([k, v]) => o[k] = v)
  return o
}

const extend = Object.assign

const matches = (ev, sel) =>
!sel || (ev.target && selmatch(ev.target, sel))

const reactEvents =
  "onCopy onCut onPaste onKeyDown onKeyPress onKeyUp onFocus onBlur onChange onInput onSubmit" +
  "onClick onContextMenu onDoubleClick onDrag onDragEnd onDragEnter onDragExit" +
  "onDragLeave onDragOver onDragStart onDrop onMouseDown onMouseEnter onMouseLeave" +
  "onMouseMove onMouseOut onMouseOver onMouseUp onTouchCancel onTouchEnd onTouchMove onTouchStart" +
  "onAbort onCanPlay onCanPlayThrough onDurationChange onEmptied onEncrypted onEnded" +
  "onError onLoadedData onLoadedMetadata onLoadStart onPause onPlay onPlaying onProgress" +
  "onRateChange onSeeked onSeeking onStalled onSuspend onTimeUpdate onVolumeChange onWaiting" +
  "onSelect onScroll onWheel onLoad onError"

const eventsByName =
  zipObj(reactEvents.split(" ").map(e => [e, e.replace(/^on/, "").toLowerCase()]))

function Delegate() {
  this.listeners = []
  this.handler = ev => this.listeners.forEach(l => matches(ev, l.sel) && l.obs.onNext(ev))
}
extend(Delegate.prototype, {
  add(obs, sel) {
    this.listeners.push({obs, sel})
  },
  rm(obs) {
    const idx = this.listeners.findIndex(l => l.obs === obs)
    if (idx !== -1) this.listeners.splice(idx, 1)
    return this.listeners.length > 0
  }
})

function Events() {
  this.elems = []
  this.delegates = {}
}
extend(Events.prototype, {
  mount(elem) {
    this.elems.push(elem)
  },
  unmount(elem) {
    const idx = this.elems.indexOf(elem)
    if (idx >= 0) this.elems.splice(idx, 1)
  },
  listen(selector, eventName) {
    const newOfKind = this.delegates[eventName]
    const d = newOfKind || (this.delegates[eventName] = new Delegate())
    if (newOfKind) this.elems.forEach(el => el.refresh())
    return O.create(o => {
      d.add(o, selector)
      return () => {
        const stillActive = d.rm(o)
        if (!stillActive) {
          delete this.delegates[eventName]
          this.elems.forEach(el => el.refresh())
        }
      }
    })
  },
  props() {
    return zipObj(Object.keys(this.delegates).map(k =>
      [eventsByName[k] || k, this.delegates[k].handler]))
  }
})

const EventWrapper = React.createClass({
  getInitialState() {
    return { props: this.props.ev.props() }
  },
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps !== this.props || nextState !== this.state
  },
  componentDidMount() {
    this.props.ev.mount(this)
  },
  componentWillUnmount() {
    this.props.ev.unmount(this)
  },
  refresh() {
    this.setState({props: this.props.ev.props()})
  },
  render() {
    return React.cloneElement(this.props.children, this.state.props)
  }
})


function makeReactDOMDriver(rootElem) {
  return function ReactDOMDriver() {
    function withEvents(vdom$) {
      return vdom$
        .map(vdom => vdom.type === EventWrapper ? vdom : React.createElement(EventWrapper, {ev: new Events()}, vdom))
        .shareReplay(1)
    }

    function events(vdom$, selector, eventName) {
      return vdom$.flatMapLatest(vdom => {
        if (vdom.type !== EventWrapper) {
          console.warn("DOM.events :: incompatible VDOM type. Perhaps you forgot to call DOM.withEvents() first?") // eslint-disable-line
          return O.never()
        } else {
          return vdom.props.ev.listen(selector, eventName)
        }
      })
    }

    const transducers = {
      React,
      h,
      events,
      withEvents
    }

    function executor(vdom$) {
      const $root = typeof rootElem === "string" ? document.querySelector(rootElem) : rootElem
      return vdom$.subscribe(vdom => {
        DOM.render(vdom, $root)
      })
    }

    return { transducers, executor }
  }
}

export default makeReactDOMDriver

// for testing package
export const __resources = {
  Delegate,
  Events,
  EventWrapper,
  eventsByName,
  matches
}
