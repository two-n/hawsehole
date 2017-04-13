import React from 'react';
import { findDOMNode } from 'react-dom';
import { select, event as d3Event } from 'd3-selection';
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
  }

  id = Math.random()

  anchorYOffset({ name }) {
    const node = select(findDOMNode(this)).select(`a[name='${name}']`).node();
    return node && this.props.anchorTop(node);
  }

  transitionScrollTo(anchor, active = false) {
    const { hash, offset, duration, ease, delay } = this.props;

    if (!anchor) return;

    if (hash) {
      if (window.history[active ? 'pushState' : 'replaceState'] != null) {
        window.history[active ? 'pushState' : 'replaceState']({}, "", `#${anchor}`);
      } else {
        window.location[active ? 'assign' : 'replace'](`#${anchor}`);
      }
    }

    const before = window.pageYOffset,
          after = this.anchorYOffset({ name: anchor }),
          interpolator = interpolate(before, after);
    const transition = select(findDOMNode(this)).transition()
      .duration(typeof duration === 'function' ? duration(before, after) : duration)
      .delay(typeof delay === 'function' ? delay(before, after) : delay);
    if (ease) transition.ease(ease);
    transition.tween('scroll', () => t => { window.scrollTo(0, interpolator(t)) });
  }

  handleScroll() {
    const anchorYOffsets = this.state.anchors.map(this.anchorYOffset.bind(this)),
          end = window.pageYOffset + findDOMNode(this).getBoundingClientRect().bottom,
          index = bisect([ ...anchorYOffsets, end ], window.pageYOffset + 1) - 1,
          current = (this.state.anchors[index] || {}).name,
          top = Math.abs(window.pageYOffset - anchorYOffsets[index]) < 1;
    if (current !== this.state.current || top !== this.state.top) {
      this.setState({ current, top });
    }
  }

  findAnchors() {
    this.setState({
      anchors:
        select(findDOMNode(this)).selectAll('a[name]').nodes().map(node => ({
          name: node.getAttribute('name'),
          text: node.textContent,
        }))
    });
  }

  componentDidMount() {
    this.timer = timer(() => {
      if (this.prevPageYOffset !== window.pageYOffset) this.handleScroll();
      this.prevPageYOffset = window.pageYOffset;
    });
    if (this.props.hash) this.connectHash();
    this.findAnchors();
  }

  componentWillUnmount() {
    this.timer.stop();
    if (this.props.hash) this.disconnectHash();
  }

  componentDidUpdate() {
    select(findDOMNode(this))
      .selectAll('a[name]')
      .classed(this.props.currentClassName, false)
      .classed(this.props.topClassName, false)
      .filter(`a[name='${this.state.current}']`)
      .classed(this.props.currentClassName, true)
      .classed(this.props.topClassName, this.state.top);
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.hash && nextProps.hash) this.connectHash();
    else if (this.props.hash && !nextProps.hash) this.disconnectHash();

    if (this.props.children !== nextProps.children) this.findAnchors();
  }

  connectHash() {
    const handleURLChange = () => {
      this.transitionScrollTo( window.location.hash.slice(1) );
    };

    handleURLChange();
    select(window).on(`hashchange.${this.id}`, () => {
      handleURLChange();
      d3Event.preventDefault();
    });
    window.history.scrollRestoration = 'manual';
  }
  disconnectHash() {
    select(window).on(`hashchange.${this.id}`, null);
    window.history.scrollRestoration = 'auto';
  }

  render() {
    const {
      navComponent: Nav,
      offset,
      hash,
      currentClassName,

      component: Component,
      style,
      className,
      children,
    } = this.props;
    
    const {
      current,
      anchors,
    } = this.state;

    const nav = Nav && (
      <Nav>
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
              >{anchor.text}</a>
            </li>
          )
        }</ul>
      </Nav>
    );

    return <Component className={className} style={style}>{nav}{children}</Component>;
  }
}
