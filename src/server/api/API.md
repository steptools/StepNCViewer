# API Endpoints

/v2/nc is appended to the beginning of all endpoints

#### *Found in state.js*

 
> **/projects/{ncId}**

Returns the information for the project defined by ncId

> **/projects/{ncId}/keystate**

Returns the current keystate for the project defined by ncId

> **/projects/{ncId}/loop/{loopstate}**

For the given project defined by ncId there are options for loopstate as follows:

- state: returns the current state
- start: starts the current simulation
- stop: stops the current simulation
- stepf: steps to the next workingstep
- stepb: steps to the last workingstep
- stepto: steps to the workingstep of the node clicked

#### *Found in projects.js*

> **/projects/**

Returns a list of projects that are in pathmap.json

#### *Found in geometry.js*

> **/projects/{ncId}/geometry**

Returns a list of geometry in JSON format for the given ncId

> **/projects/{ncId}/geometry/{uuid}/{type}**

Returns a JSON format geometry information for the given ncId with uuid and type given

#### *Found in step.js*

> **/projects/{ncId}/workplan/{wsId}**

Returns the workingstep in JSON format for the project specified by ncId and workingstep specified by wsId

> **/projects/{ncId}/workplan**

Returns the main workplan in JSON format for the given project by ncId