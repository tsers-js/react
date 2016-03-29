# TSERSful React DOM Interpreter

Render your virtual DOM with React in a TSERSful way.

[![Travis Build](https://img.shields.io/travis/tsers-js/react/master.svg?style=flat-square)](https://travis-ci.org/tsers-js/react)
[![Code Coverage](https://img.shields.io/codecov/c/github/tsers-js/react/master.svg?style=flat-square)](https://codecov.io/github/tsers-js/react)
[![NPM version](https://img.shields.io/npm/v/@tsers/react.svg?style=flat-square)](https://www.npmjs.com/package/@tsers/react)
[![Gitter](https://img.shields.io/gitter/room/tsers-js/chat.js.svg?style=flat-square)](https://gitter.im/tsers-js/chat)
[![GitHub issues](https://img.shields.io/badge/issues-%40tsers%2Fcore-blue.svg?style=flat-square)](https://github.com/tsers-js/core/issues)

## Usage

### Installation

```
npm i --save @tsers/react
``` 

### Using the interpreter

`@tsers/react` provides a factory function which can be used to construct the actual
interpreter. That factory function takes one mandatory parameter: `rootElement` which
defines the root element for the rendered application. The given root element can 
be one of the following:

* DOM Node
* Query selector (string)

```javascript
import TSERS from "@tsers/core"
import ReactDOM from "@tsers/react"
import main from "./YourApp"

TSERS(main, {
  DOM: ReactDOM("#app")       // equivalent to ReactDOM(document.getElementById("app"))
})
```

## API reference

### Signals

React DOM interpreter provides the following signal transform functions

#### `h :: (tag, attrs, [text?, Elements?,...]) => ReactElement`

[Hyperscript](https://github.com/dominictarr/hyperscript) helper function for
React element (VNode) creation

Example:
```javascript
function main({DOM}) {
  const {h} = DOM
  const vnode = h("h1.title", {style: {color: "red"}}, "Tsers!")
  // ...
}
```

#### `prepare :: ReactElement$ => PreparedReactElement$` 

Takes a stream of `ReactElement`s and returns a stream of prepared `ReactElement`s. 
Prepared `ReactElement`s are elements that can produce events via `DOM.events` 
transform function. 

React interpreter also expects that the output signals are prepared by using the
`prepare` signal transformer.

```javascript 
function main({DOM}) {
  const {h} = DOM 
  const vdom$ = DOM.prepare(Observable.just(h("h1.title", "Tsers!")))
  // ...
}
``` 

#### `events :: (PreparedReactElement$, selector, type) => event$`

Takes a stream of prepared react elements, CSS query selector and the listened 
event type and returns DOM events *belonging to the given prepared elements.* 
If the given element stream is not prepared with `prepare` transform function first, 
`events` displays a warning and returns an empty observable sequence.

```javascript
function main({DOM}) {
  const {h} = DOM 
  const vdom$ = DOM.prepare(Observable.just(
    h("div", [
      h("button.inc", "++"),
      h("button.dec", "--")
    ])))
  
  const incClick$ = DOM.events(vdom$, ".inc", "click")
  const decClick$ = DOM.events(vdom$, ".dec", "click")
  // ...
}
```

#### `React`

Just a reference to the underlying `react` instance. Use this if you want to 
e.g. use JSX in your application.

```javascript
function main({DOM}) {
  const {React} = DOM 
  const vdom$ = DOM.prepare(Observable.just(
    <div>
      <button className="inc">++</button>
      <button className="dec">--</button>
    </div>))
  
  const incClick$ = DOM.events(vdom$, ".inc", "click")
  const decClick$ = DOM.events(vdom$, ".dec", "click")
  // ...
}
```

### Output signals

React DOM interpreter expects a stream of prepared react elements. Those elements
will be rendered to the root node every time when the output stream produces new
signals (virtual dom changes).

```javascript
function main({DOM, mux}) {
  const {h} = DOM
  const vdom$ = DOM.prepare(Observable.just(h("h1.title", "Tsers!")))
  return mux({
    DOM: vdom$
  })
}
```


## License

MIT

