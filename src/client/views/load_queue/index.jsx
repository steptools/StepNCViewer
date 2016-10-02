/* Copyright G. Hemingway, 2015 - All rights reserved */
'use strict';

require('../../stylesheets/components/load_queue.scss');

/*************************************************************************/

class QueueItem extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <li className='row'>
        <span className='filename col-xs-8'>
          {this.props.name}
        </span>
        <span className='fileperc col-xs-4 pull-right'>
          {this.props.loaded}
        </span>
      </li>
    );
  }
}

export default class LoadQueueView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {queue: []};
    this.onQueueEvent = this.onQueueEvent.bind(this);
  }

  onQueueEvent(ev) {
    let queue;
    if (ev.type === 'addRequest') {
      this.setState({queue: this.state.queue.concat({
        name: ev.path,
        loaded: '0%',
        status: 'loading',
      })});
    } else if (ev.type === 'loadProgress') {
      queue = _.map(this.state.queue, function(item) {
        if (item.name === ev.file) {
          item.loaded = ev.loaded.toFixed(2) + '%';
        }
        return item;
      });
      this.setState({queue: queue});
    } else if (ev.type === 'loadComplete') {
      queue = _.filter(this.state.queue, function(file) {
        return file.name !== ev.file;
      });
      this.setState({queue: queue});
    }
  }

  componentWillMount() {
    let mount = [
      'addRequest',
      'loadComplete',
      'parseComplete',
      'workerFinish',
      'loadProgress',
    ];
    for (let i = 0; i < mount.length; i++) {
      this.props.dispatcher.addEventListener(mount[i], this.onQueueEvent);
    }
  }

  componentWillUnmount() {
    let dismount = [
      'addRequest',
      'loadComplete',
      'parseComplete',
      'workerFinish',
      'loadProgress',
    ];
    for (let i = 0; i < dismount.length; i++) {
      this.props.dispatcher.removeEventListener(dismount[i], this.onQueueEvent);
    }
  }

  render() {
    let items = this.state.queue.map(function(item, index) {
      return (
        <QueueItem key={index} name={item.name} loaded={item.loaded} />
      );
    });
    let style = items.length > 0 ? 'load-queue' : 'load-queue out';
    return (
      <div className={style}>
        <div className="load-queue-header">
          <span>Downloads&nbsp;</span>
          <span>({items.length}):</span>
        </div>
        <ul className="container-fluid">{items}</ul>
      </div>
    );
  }
}

LoadQueueView.propTypes = {
  dispatcher: React.PropTypes.object.isRequired,
  guiMode: React.PropTypes.number.isRequired,
};
