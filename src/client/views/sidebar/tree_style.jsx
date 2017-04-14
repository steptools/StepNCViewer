'use-strict';

function getNodeIcon(node) {
  if (node.type === 'workplan') {
    return <span className='icon glyphicons glyphicons-cube-empty'/>;
  } else if (node.type === 'selective') {
    return <span className='icon glyphicons glyphicons-list-numbered'/>;
  } else if (node.type === 'workplan-setup') {
    return <span className='icon glyphicons glyphicons-cube-black'/>;
  } else if (node.type === 'workingstep') {
    return <span className='icon glyphicons glyphicons-blacksmith'/>;
  } else if (node.type === 'tolerance') {
    return <span className={'icon custom tolerance ' + node.toleranceType} />;
  } else if (node.type === 'workpiece') {
    return <span className='icon custom workpiece'/>;
  } else if (node.type === 'datum') {
    return <span className={'icon custom datum ' + node.name} />;
  } else if (node.type === 'divider') {
    return null;
  } else {
    return <span className='icon glyphicons glyphicons-question-sign'/>;
  }
}

function hasActiveChildren(node, id) {
  if (node.id === id) {
    return 'active';
  }
  if (node.leaf) {
    return 'inactive';
  }
  for (let i = 0; i < node.children.length; i++) {
    if (hasActiveChildren(node.children[i],id) === 'active') {
      if (node.toggled === false) {
        return 'active';
      } else {
        return 'child-active';
      }

    } else if (hasActiveChildren(node.children[i],id) ==='child-active') {
      if (node.toggled === false) {
        return 'active';
      } else {
        return 'child-active';
      }
    }
  }
  return 'inactive';
}

function setDatumInfo(node, props) {

  if (props.decorators.highlightedTolerances.indexOf(node.id) >= 0) {
    node.highlightName = 'open';
  } else {
    node.highlightName = 'close inactive';
  }

  node.highlightIcon = 'highlight-button glyphicons glyphicons-eye-';
  node.highlightIcon += node.highlightName;

  let clickEvent = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    props.decorators.toggleHighlight(node.id);
  };

  let workpiece = props.decorators.toleranceCache[node.workpiece];

  if (node.openPreview && props.decorators.highlightedTolerances.indexOf(node.id) < 0) {
    clickEvent = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      let prom = new Promise((resolve) => {
        props.decorators.propertyCb(workpiece, false, resolve);
      });

      prom.then(() => {
        props.decorators.toggleHighlight(node.id);
        props.decorators.selectEntity({key: 'preview'}, node);
      });
    }
  }

  node.highlightButton = (
    <span
      className={node.highlightIcon}
      onClick={clickEvent}
    />
  );
}

function setToleranceInfo(node, props) {
  node.name += ' - ' + node.value + node.unit + ' ' + node.rangeName;

  if (props.decorators.highlightedTolerances.indexOf(node.id) >= 0) {
    node.highlightName = 'open';
  } else {
    node.highlightName = 'close inactive';
  }

  node.highlightIcon = 'highlight-button glyphicons glyphicons-eye-';
  node.highlightIcon += node.highlightName;

  let clickEvent = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    props.decorators.toggleHighlight(node.id);
  };

  if (node.openPreview && props.decorators.highlightedTolerances.indexOf(node.id) < 0) {
    clickEvent = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      let prom = new Promise((resolve) => {
        props.decorators.propertyCb(node, false, resolve);
      });

      prom.then(() => {
        props.decorators.toggleHighlight(node.id);
        props.decorators.selectEntity({key: 'preview'}, node);
      });
    }
  }

  node.highlightButton = (
    <span
      className={node.highlightIcon}
      onClick={clickEvent}
    />
  );
}

function setToggle(node) {
  node.toggleName = 'toggle';
  if (node.leaf === true) {
    node.toggleName = 'toggle-hidden';
  } else if (node.toggled === true) {
    node.toggleName += ' glyphicon glyphicon-chevron-down';
  } else {
    node.toggleName += ' glyphicon glyphicon-chevron-right';
  }
}

function setWorkingstepInfo(node, props) {

  node.highlightButton = (
    <span
      key='preview'
      className='icon preview glyphicons glyphicons-new-window-alt'
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        let prom = new Promise((resolve) => {
          props.decorators.propertyCb(node, false, resolve);
        });

        prom.then(() => {
          props.decorators.selectEntity({key: 'preview'}, node);
        });
      }}
    />);
}

function setNodeInfo(props) {
  let node = props.node;
  if (!node.icon) {
    node.icon = getNodeIcon(node);
  }

  node.innerName = 'inner';
  node.outerName = 'node';
  if (hasActiveChildren(node, props.decorators.ws) === 'active') {
    node.innerName += ' running-node';
  } else if (node.enabled === false) {
    node.innerName += ' disabled';
  }

  if (node.type === 'workingstep') {
    setWorkingstepInfo(node, props);
  }

  setToggle(node);

  if (node.type === 'tolerance') {
    setToleranceInfo(node, props);
  }
  if (node.type === 'datum') {
    setDatumInfo(node, props);
  }

  if (node.type === 'divider') {
    node.outerName += ' divider';
    node.innerName += ' divider';
  }

  return node;
}

const Container = (props) => {
  let node = setNodeInfo(props);
  let outerName = node.outerName;
  if(node.status === 'tolerance red'){
    outerName+=' status-red'
  } else if(node.status === 'tolerance yellow') {
    outerName+=' status-yellow'
  } else if(node.status === 'tolerance green') {
    outerName+=' status-green'
  }
  // TODO: REPLACE WORKINGSTEP ICON WITH A NUMBER

  return (
    <div
      id={node.id}
      className={outerName}
    >
      <div
        className={node.toggleName}
        onClick={props.onClick}
      />
      <div
        className={node.innerName}
        onClick={() => {
          if (!node.outerName.includes('divider') && node.type !== 'datum') {
            props.decorators.propertyCb(node);
          }
        }}
      >
        {node.icon}
        <span className='textbox'>
          {node.name}
        </span>
        {node.highlightButton}
      </div>
    </div>
  );
};

const decorators = {Container};

const style = {
  tree: {
    base: {
      listStyle: 'none',
    },
    node: {
      base: {
        listStyle: 'none',
      },
    },
  },
};

export default {
  decorators,
  style,
};
