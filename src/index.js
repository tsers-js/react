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

const keys = x => x ? Object.keys(x) : []

const values = obj => keys(obj).map(k => obj[k])

const extend = Object.assign

const matches = (ev, sel) => !sel || (ev.target && selmatch(ev.target, sel))

const boundaryMakerAttr = "data-scope-boundary"

const isScopeBoundary = (el) => el.hasAttribute && el.hasAttribute(boundaryMakerAttr)

const belongsToScope = (ev) => {
  const scopeRoot = ev.currentTarget
  let currentEl = ev.target
  while(currentEl) {
    if (currentEl === scopeRoot) {
      return true
    } else if (isScopeBoundary(currentEl)) {
      return false
    }
    currentEl = currentEl.parentNode
  }

  return false
}

const shallowEq = (a, b) => {
  const aKeys = keys(a), bKeys = keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (let i = 0; i < aKeys.length; i++) {
    if (a[aKeys[i]] !== b[aKeys[i]]) return false
  }
  return true
}

const rm = (arr, obj) => {
  const idx = arr.indexOf(obj)
  if (idx !== -1) arr.splice(idx, 1)
  return arr.length
}

const reactEvents =
  "onCopy onCut onPaste onKeyDown onKeyPress onKeyUp onFocus onBlur onChange onInput onSubmit " +
  "onClick onContextMenu onDoubleClick onDrag onDragEnd onDragEnter onDragExit " +
  "onDragLeave onDragOver onDragStart onDrop onMouseDown onMouseEnter onMouseLeave " +
  "onMouseMove onMouseOut onMouseOver onMouseUp onTouchCancel onTouchEnd onTouchMove onTouchStart " +
  "onAbort onCanPlay onCanPlayThrough onDurationChange onEmptied onEncrypted onEnded " +
  "onError onLoadedData onLoadedMetadata onLoadStart onPause onPlay onPlaying onProgress " +
  "onRateChange onSeeked onSeeking onStalled onSuspend onTimeUpdate onVolumeChange onWaiting " +
  "onSelect onScroll onWheel onLoad onError"

const nativeEventMapping = {
  dblclick: "onDoubleClick"
}

const eventsByName =
  zipObj(reactEvents.split(" ").map(e => [e.replace(/^on/, "").toLowerCase(), e]))

const reactEventName = eventName => {
  return eventsByName[eventName] || nativeEventMapping[eventName] || eventName
}

/*
 * Mutable multicasting proxy object that allows (de)registering
 * observers and broadcasting 'next' and 'completed' events to them
 */
function MulticastProxy() {
  this.obs = []
  this.next = this.next.bind(this)
  this.dispose = this.dispose.bind(this)
}
extend(MulticastProxy.prototype, {
  add(obs) {
    this.obs.push(obs)
  },
  rm(obs) {
    return rm(this.obs, obs) === 0
  },
  next(ev) {
    this.obs.forEach(o => o.next(ev))
  },
  dispose() {
    this.obs.forEach(o => o.completed())
    this.obs = []
  }
})

/*
 * Event source that listens to React element lifecycle methods and
 * allows subscribing to element's events, managing the event listener
 * attachment/detachment under the hood.
 */
function EventSource() {
  this.elems = []
  this.proxies = {}
}
extend(EventSource.prototype, {
  mount(elem) {
    if (this.elems.indexOf(elem) === -1) {
      this.elems.push(elem)
      if (keys(this.proxies).length > 0) {
        this.refreshListeners([elem])
      }
    }
  },
  unmount(elem) {
    if (rm(this.elems, elem) === 0) {
      const p = this.proxies
      this.proxies = []
      values(p).forEach(proxy => proxy.dispose())
    }
  },
  refreshListeners(elems) {
    elems = elems || this.elems
    const p = this.proxies
    const listeners = zipObj(keys(p).map(k => [reactEventName(k), p[k].next]))
    elems.forEach(elem => {
      if (!elem.state || !shallowEq(elem.state.listeners, listeners)) {
        elem.setState({listeners})
      }
    })
  },
  subscribe(selector, eventName) {
    const observer = o => ({
      next: ev => {
        if (o && matches(ev, selector) && 
          belongsToScope(ev)) {
          o.onNext(ev)
        } else {
          return null
        }
      },
      completed: () => o && o.onCompleted()
    })
    const isNew = !(eventName in this.proxies)
    const proxy = isNew ? (this.proxies[eventName] = new MulticastProxy()) : this.proxies[eventName]
    return O.create(o => {
      const obs = observer(o)
      proxy.add(obs)
      if (isNew) {
        this.refreshListeners()
      }
      return () => proxy.rm(obs) && delete this.proxies[eventName]
    })
  }
})

const Prepared = React.createClass({
  componentDidMount() {
    this.props.events.mount(this)
  },
  componentWillReceiveProps(nextProps) {
    if (nextProps.events !== this.props.events) {
      this.props.events.unmount(this)
      nextProps.events.mount(this)
    }
  },
  componentWillUnmount() {
    this.props.events.unmount(this)
  },
  render() {
    const children = this.props.children
    const bondaryMarker = {[boundaryMakerAttr]: true}
    return !this.state ? 
      React.cloneElement(children, bondaryMarker) :
      React.cloneElement(children, {...this.state.listeners, ...bondaryMarker})
  }
})


export default function makeReactDOM(rootElem) {
  return function ReactDOM() {
    function prepare(vdom$) {
      return vdom$
        .map(vdom => vdom.type === Prepared ? vdom
          : React.createElement(Prepared, {events: new EventSource()}, vdom))
        .shareReplay(1)
    }

    function events(vdom$, selector, eventName) {
      return vdom$.merge(O.never()).flatMap(vdom => {
        if (vdom.type !== Prepared) {
          console.warn(                                 // eslint-disable-line
            "DOM.events :: VDOM is not prepared for event listening.",
            "Perhaps you forgot to call DOM.prepare(vdom$)?"
          )
          return O.empty()
        } else {
          return vdom.props.events.subscribe(selector, eventName)
        }
      })
    }

    const Transforms = {
      React,
      h,
      events,
      prepare
    }

    function executor(vdom$) {
      const $root = typeof rootElem === "string" ? document.querySelector(rootElem) : rootElem
      return vdom$.subscribe(vdom => {
        DOM.render(vdom, $root)
      })
    }

    return [Transforms, executor]
  }
}
