import React from 'react';
import { findDOMNode } from 'react-dom';
import { select } from 'd3-selection';
import 'd3-transition';
import { interpolate } from 'd3-interpolate';
import { bisect } from 'd3-array';
import { timer } from 'd3-timer';

export default class Hawsehole extends React.PureComponent {

  static defaultProps = {

    // Set to true to enable reading and writing URL hash,
    // or to 'push' to also enable pushState on nav click
    hash: false,

    // Tag or React component to wrap nav, or null for no nav
    navComponent: 'nav',

    // Class assigned to prominent anchor in viewport, and corresponding nav li
    currentClassName: 'current',

    // Class also assigned to current anchor if at viewport top
    topClassName: 'top',

    // Function for computing each anchor node's document offset
    anchorTop: node => node.getBoundingClientRect().top + window.pageYOffset,


    /*
     * Scroll transition
     */

    // If function passed for duration or delay, receives scroll position before and after as arguments
    delay: 0,  // (in ms)
    duration: (a, b) => Math.pow(Math.abs(a - b), 0.75) + 300,  // (in ms)
    ease: null,  // defaults to D3's default easing


    /*
     * Container component
     */

    // Tag or React component to wrap nav component and children
    component: 'div',

    // Passed along to container
    className: null,
    style: null,

  }

  state = {
    current: null,
    top: false,
    anchors: [],
    anchorRoot: { children: [] },
  }

  constructor(props) {
    super(props);
    this.handleHashchange = this.handleHashchange.bind(this);
  }

  transitionScrollTo(name, active = false) {
    const { hash, offset, duration, ease, delay } = this.props;

    const anchorNode = select(findDOMNode(this)).select(`a[name='${name}']`).node();
    if (!anchorNode) return;

    if (hash) {
      const push = active && hash === 'push';
      if (window.history[push ? 'pushState' : 'replaceState'] != null) {
        window.history[push ? 'pushState' : 'replaceState']({}, "", `#${name}`);
      } else {
        window.location[push ? 'assign' : 'replace'](`#${name}`);
      }
    }

    const before = window.pageYOffset,
          after = this.props.anchorTop(anchorNode),
          interpolator = interpolate(before, after);
    const transition = select(findDOMNode(this)).transition()
      .duration(typeof duration === 'function' ? duration(before, after) : duration)
      .delay(typeof delay === 'function' ? delay(before, after) : delay);
    if (ease) transition.ease(ease);
    return transition.tween('scroll', () => t => { window.scrollTo(0, interpolator(t)) });
  }

  handleScroll() {
    const { anchors, current, top } = this.state,
          anchorTops = anchors.map(({ node }) => this.props.anchorTop(node)),
          end = window.pageYOffset + findDOMNode(this).getBoundingClientRect().bottom,
          index = bisect([ ...anchorTops, end ], window.pageYOffset + 1) - 1,
          nextCurrent = (anchors[index] || {}).name,
          nextTop = Math.abs(window.pageYOffset - anchorTops[index]) < 1;
    if (nextCurrent !== current || nextTop !== top) {
      this.setState({ current: nextCurrent, top: nextTop });
    }
  }

  findAnchors() {
    const list = [],
          stack = [{ children: [], headingLevel: 0 }];

    select(findDOMNode(this)).selectAll('a[name]').each(function() {
      const match = this.children[0] && this.children[0].tagName.match(/h(\d+)/i),
            headingLevel = match ? +match[1] : Infinity;

      const anchor = {
        node: this,
        name: this.getAttribute('name'),
        children: [],
        headingLevel,
      };
      list.push(anchor);

      while (headingLevel <= stack[stack.length - 1].headingLevel) stack.pop();
      stack[stack.length - 1].children.push(anchor);
      stack.push(anchor);
    });

    this.setState({ anchors: list, anchorRoot: stack[0] });
  }

  componentDidMount() {
    this.timer = timer(() => {
      if (this.prevPageYOffset !== window.pageYOffset) this.handleScroll();
      this.prevPageYOffset = window.pageYOffset;
    });
    this.findAnchors();
  }

  componentWillUnmount() {
    this.timer.stop();
    if (this.props.hash) this.disconnectHash();
  }

  componentDidUpdate(prevProps) {
    select(findDOMNode(this))
      .selectAll('a[name]')
      .classed(this.props.currentClassName, false)
      .classed(this.props.topClassName, false)
      .filter(`a[name='${this.state.current}']`)
      .classed(this.props.currentClassName, true)
      .classed(this.props.topClassName, this.state.top);

    if (!this.hashConnected && this.props.hash) this.connectHash();
    else if (this.hashConnected && !this.props.hash) this.disconnectHash();

    if (prevProps.children !== this.props.children) this.findAnchors();
  }

  hashConnected = false
  handleHashchange(event) {
    const transition = this.transitionScrollTo( window.location.hash.slice(1) );
    if (transition && event) event.preventDefault();
  }
  connectHash() {
    this.handleHashchange();
    window.addEventListener('hashchange', this.handleHashchange);
    window.history.scrollRestoration = 'manual';
    this.hashConnected = true;
  }
  disconnectHash() {
    window.removeEventListener('hashchange', this.handleHashchange);
    window.history.scrollRestoration = 'auto';
    this.hashConnected = false;
  }

  renderAnchors(anchors) {
    const {
      currentClassName,
    } = this.props;
    
    const {
      current,
    } = this.state;

    return !anchors.length ? null : (
      <ul>{
        anchors.map(anchor =>
          <li key={anchor.name}>
            <a
              href={`#${anchor.name}`}
              className={anchor.name === current ? currentClassName : ''}
              onClick={event => {
                this.transitionScrollTo(anchor.name, true);
                event.preventDefault();
              }}
            >{ anchor.node.textContent }</a>

            { this.renderAnchors(anchor.children) }
          </li>
        )
      }</ul>
    );
  }

  render() {
    const {
      navComponent: Nav,
      component: Component,
      style,
      className,
      children,
    } = this.props;
    
    const {
      anchorRoot,
    } = this.state;

    const nav = Nav && <Nav>{ this.renderAnchors(anchorRoot.children) }</Nav>;
    return (
      <Component
        className={className}
        style={style}
      >{nav}{children}</Component>
    );
  }
}
