import React from 'react';
import { findDOMNode } from 'react-dom';
import { select, event as d3Event } from 'd3-selection';
import { transition } from 'd3-transition';
import { interpolate } from 'd3-interpolate';
import { bisect } from 'd3-array';
import { timer } from 'd3-timer';

export default class Hawsehole extends React.PureComponent {

  static defaultProps = {
    navComponent: 'nav',
    offset: 0,
    hash: false,
    currentClassName: 'current',
    topClassName: 'top',

    component: 'div',
    className: null,
    style: null,
  }

  state = {
    current: null,
    top: false,
    anchors: [],
  }

  id = Math.random()

  anchorYOffset(anchor) {
    const node = select(findDOMNode(this)).select(`a[name='${anchor}']`).node();
    return node && (window.pageYOffset + node.getBoundingClientRect().top);
  }

  transitionScrollTo(anchor, offset = 0, push = false) {
    if (this.props.hash) {
      if (window.history[push ? 'pushState' : 'replaceState'] != null) {
        window.history[push ? 'pushState' : 'replaceState']({}, "", `#${anchor}`);
      } else {
        window.location[push ? 'assign' : 'replace'](`#${anchor}`);
      }
    }

    select(findDOMNode(node)).transition().tween('scroll', () => {
      const i = interpolate(window.pageYOffset, this.anchorYOffset(anchor) - offset);
      return t => { window.scrollTo(0, i(t)) };
    });
  }

  handleScroll() {
    const end = window.pageYOffset + findDOMNode(this).getBoundingClientRect().bottom,
          anchorYOffsets = [ ...this.state.anchors.map(this.anchorYOffset.bind(this)), end ],
          index = bisect(anchorYOffsets, window.pageYOffset + this.props.offset + 1) - 1,
          current = this.state.anchors[index],
          top = Math.abs(window.pageYOffset + this.props.offset - anchorYOffsets[index]) < 1;
    if (current !== this.state.current || top !== this.state.top) {
      this.setState({ current, top })
    }
  }

  findAnchors() {
    this.setState({
      anchors:
        select(findDOMNode(this))
          .selectAll('a[name]')
          .nodes()
          .map(node => select(node).attr('name'))
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
      const anchor = window.location.hash.slice(1);
      if (anchor) this.transitionScrollTo(anchor, this.props.offset);
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
            <li key={anchor}>
              <a
                href={`#${anchor}`}
                className={anchor === current ? currentClassName : '' }
                onClick={event => {
                  this.transitionScrollTo(anchor, offset, hash === 'push');
                  event.preventDefault();
                }}
              >{anchor}</a>
            </li>
          )
        }</ul>
      </Nav>
    );

    return <Component className={className} style={style}>{nav}{children}</Component>;
  }
}
