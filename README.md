# TSERSful React DOM Driver

[![Travis Build](https://img.shields.io/travis/tsers-js/react/master.svg?style=flat-square)](https://travis-ci.org/tsers-js/react)
[![Code Coverage](https://img.shields.io/codecov/c/github/tsers-js/react/master.svg?style=flat-square)](https://codecov.io/github/tsers-js/react)
[![NPM version](https://img.shields.io/npm/v/@tsers/react.svg?style=flat-square)](https://www.npmjs.com/package/@tsers/react)
[![Gitter](https://img.shields.io/gitter/room/tsers-js/chat.js.svg?style=flat-square)](https://gitter.im/tsers-js/chat)
[![GitHub issues](https://img.shields.io/badge/issues-%40tsers%2Fcore-blue.svg?style=flat-square)](https://github.com/tsers-js/core/issues)

## Example

```javascript
import {Observable as O} from "rx"
import TSERS as "@tsers/core"
import makeReactDOM as "@tsers/react"

const main = T => in$ => {
  const {DOM: {h, prepare, events}, decompose, compose} = T

  const [actions] = decompose(in$, "add$")
  return intent(view(model(actions)))

  function model({addBang$}) {
    const msg$ = addBang$
      .map(() => "!")
      .startWith("Tsers")
      .scan((acc, s) => acc + s)
    return msg$
  }

  function view(msg$) {
    const vdom$ = msg$.map(msg =>
      h("div", [
        h("h1", msg),
        h("button.add", "Click me!")
      ]))
    return prepare(vdom$)
  }

  function intent(vdom$) {
    const addBang$ = events(vdom$, ".add", "click")
    const loop$ = compose({addBang$})
    const out$ = compose({DOM: vdom$})
    return [out$, loop$]
  }
}

const [Transducers, signals, execute] = TSERS({
  DOM: makeReactDOM("#app")
})
const { run } = Transducers
execute(run(signals, main(Transducers)))
``` 

## API reference

### Driver creation

In order to create a React DOM driver, you must give the root element for
the rendered application. The given root element must be one of the following:

* DOM Node
* Query selector (string)

Example:
```javascript
import TSERS from "@tsers/core"
import makeReactDOM from "@tsers/react"
import main from "./your-app"

const [T, S, E] = TSERS({
  DOM: makeReactDOM("#app")       // or makeReactDOM(document.getElementById("app"))
})
...
```

### Input signals

React DOM driver doesn't emit any input signals.

### Transducers

React DOM driver provides the following transducers and helper functions

#### `h :: (tag, attrs, [text?, Elements?,...]) => ReactElement`

[Hyperscript](https://github.com/dominictarr/hyperscript) helper function for
React element creation

Example:
```javascript
const vnode = h("h1.title", {style: {color: "red"}}, "Tsers!")
```

#### `prepare :: VNode$ => PreparedVNode$` 

Takes a stream of VNodes and returns a stream of prepared VNodes.
Prepared VNodes are just like normal VNodes but you can also get DOM events
from them by using `events` transducer.

Example:
```javascript 
const vdom$ = Observable.just(h("h1.title", "Tsers!"))
const preparedVdom$ = prepare(vdom$)
``` 

#### `events :: (PreparedVNode$, selector, type) => event$`

Takes a stream of prepared VNodes, CSS query selector and the listened event type and
returns DOM events *belonging to the given prepared vnodes.* If the given
VNode stream is not prepared with `prepare` transducer first, then `events`
shows a warning and returns an empty observable sequence.

Example:
```javascript
const vdom$ = prepare(Observable.just(h("div", [
  h("h1", "Tsers"),
  h("button", "Click me!")
])))
const click$ = events(vdom$, "button", "click")
```

#### `React`

Just a reference to the underlying React instance. Use this if you want to 
e.g. use JSX in your application.

Example:
```javascript
const main = T => in$ => {
  const {DOM: {React}} = T
  ...
  function view(model$) {
    return model$.map(model =>
      <div>
        <h1>{model.msg}</h1>
        <button>tsers!</button>
      </div>)
  }
  ...
}
```

### Output signals

React DOM driver expects a stream of VNodes containing the application Vtree
that should be rendered to the root element.

Example:
```javascript
const main T => in$ => {
  const {DOM: {h}, compose} = T
  const vdom$ = Observable.just(h("h1", "Tsers!"))
  return compose({
    DOM: vdom$
  })
}
```


## License

MIT

