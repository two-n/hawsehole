# Hawsehole ⚓

React component for navigation and transitions among named anchors.

`npm install --save hawsehole` (or `yarn add hawsehole`)

```jsx
import Hawsehole from 'hawsehole';

<Hawsehole
  // All props optional. Defaults:

  navComponent="nav"  // tag or React component to wrap nav, or null for no nav
  hash={false}  // true to enable read and write URL hash
                // or 'push' to also enable pushState on nav click
  offset={0}  // offset (in px) from anchor top
  currentClassName="current"  // class assigned to prominent anchor in viewport,
                              // and corresponding nav li
  topClassName="top"  // class also assigned to current anchor if at viewport top

  // Scroll transition:
  delay={0}
  duration={(a, b) => Math.pow(Math.abs(a - b), 0.75) + 300}  // (in ms)
  // Note: if function passed for duration or delay, receives scroll position before and after as arguments
  ease={null}  // defaults to D3's default easing

  // Container component:
  component="div"
  className={null}  // Passed along to container
  style={null}  // Passed along to container
>

  {/* Example: */}
  <a name="constitution"><h1>The Constitution of the United States</h1></a>

  <a name="preamble"><h2>Preamble</h2></a>
  <p>We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.</p>

  <section>
    <a name="article-I"><h2>Article I</h2></a>
    
    <section>
      <a name="article-I-section-1"><h3>Section 1</h3></a>
      <p>All legislative Powers herein granted shall be vested in a Congress of the United States, which shall consist of a Senate and House of Representatives.</p>
    </section>
    
    <section>
      <a name="article-I-section-2"><h3>Section 2</h3></a>
      <p>1: The House of Representatives shall be composed of Members chosen every second Year ...</p>
    </section>

  </section>

</Hawsehole>
```

Planned features:
- scrolling to anchor on demand via prop
- optionally replacing hash with scrolled anchor, as well as clicked nav option
