# **API Endpoints**

*IMPORTANT: /v3/nc is appended to the beginning of all endpoints

### *Found in state.js*
---
> **/state/key**

Returns the current keystate

> **/state/delta**

Returns the current delta state

> **/state/loop/**

Returns the current state (e.g. play or pause)

> **/state/loop/{loopstate}**

For loopstate the options are as follows:

 - start : starts the simulation
 - stop : stops the simulation
 - {int} : changes the speed of the simulation

> **/state/ws/{command}**

For command the options are as follows:

 - next : moves the simulation to the next workingstep
 - prev : moves the simulation to the previous workingstep
 - {int} : moves the simulation to a specific workingstep defined by the int 

### *Found in geometry.js*
---
> **/geometry**

Returns a list of geometry in JSON format

> **/geometry/{uuid}/{type}**

Returns a JSON format geometry information for the given uuid and type

> **/geometry/{eid}**

Returns a JSON format geometry information for the given eid

> **/id/{uuid}**

Returns the entity id that is associated with the uuid given

### *Found in step.js*
---
> **/workplan/{wsId}**

Returns the workingstep in JSON format for the workingstep specified by wsId

> **/workplan**

Returns the main workplan in JSON format

> **/setup/{wsId}**

Returns the highest level container id for the given wsId 

### *Found in tool.js*
---
> **/tools**

Returns a list of tools

> **/tool/{toolId}**

Returns the tool information for the tool specified by toolId

> **/tools/{wsId}**

Returns the tool information for the workingstep specified by wsId

### *Found in tolerances.js*
---
> **/tolerances/{wsId}**

Returns the tolerances associated with workingstep specified by wsId and any datums associated with that tolerance

> **/tolerances/**

Returns the tolerances associated with the current model

> **/workpieces/**

Returns all of the workpieces associated with the current model as well as all the tolerances and datums associated with each workpiece

### *Found in changelog.js*
---
> **/changelog**

Returns the current change log on the server

