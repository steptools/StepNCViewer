![Alt text](http://www.clker.com/cliparts/q/E/D/g/o/S/stick-figure-dark-grey-th.png "Documenting Mascot")

# **Client Side**
---
#### ***View* React Components** 
##### ***View* Hierarchy**
- Responsive
    * HeaderView
    * SidebarView
        * WorkingstepList View
        * WorkplanList View
        * ToolList View
        * ToleranceList View
    * Footer View (only in mobile mode)
    * CAD View
        * Compass View
        * Loadqueue View
##### ***View* Layout and Descriptions**
**Header View** corresponds to the top pane on the UI that houses the play, previous, next, etc.  
**Footer View** corresponds to the bottom pane on the UI (only in mobile mode) that houses the play, previous, and next buttons.  
**Sidebar View** corresponds to the pane on the left of the screen that houses the five views:
1. **Workingsteplist View**
    * This view will render when the svmode of **Responsive View** is set to 'ws' and uses renderNode to populate the pane with elements from workingstepCache which are keyed off of iDs that reside in the workingstepList in **Responsive View**
2. **WorkplanList View**
    * This view will render when the svmode of **Responsive View** is set to 'tree' and uses renderNode to populate the pane with elements from workplanCache in **Responsive View** and uses TreeBeard React Component which can be found [here](https://github.com/alexcurtis/react-treebeard)
3. **ToolList View**
    * This view will render when the svmode of **Responsive View** is set to 'tools' and uses renderNode to populate the pane with elements from toolList in **Responsive View**
4. **ToleranceList View**
    * This view will render when the svmode of **Responsive View** is set to 'tolerance' and uses renderNode to populate the pane with elements from toleranceCache in **Responsive View** and uses TreeBeard React Component which can be found [here](https://github.com/alexcurtis/react-treebeard)
5. **PropertiesPane View**
    * This view will always render off the left side of the viewing window and will be pulled from the left side when the openProperties callback function is used 

as well as the information that is displayed below each of these tabs according to the model currently loaded. The sidebar handles which view is being shown by changing the svmode within the responsive view state.  
**CAD View** corresponds to the scene pane in the middle that houses all of the geometry that is rendered as well as the **Compass View** in the top right corner that allows for orientation of the model to be tracked and **LoadQueue View** in the bottom right corner to track whether or not a piece of geometry has finished loading initially.  
**Responsive View** is the top level view that houses all other views and will render certain ones based on the guimode variable (zero = desktop, one = mobile)

#### ***Model* React Components**  

##### ***Model* Hierarchy**

- CADManager
- DataLoader
- WebWorker
- NC
    * Annotation
    * Shell
- Assembly
    * Shape
    * Product

##### ***Model* Descriptions**
*Annotation* - Used to process incoming annotation data into Three.js geometry so that it can be rendered by the **CAD View**.   
An Annotation is rendered when postMessage is called from the background webworker and this message must contain the annotationLoad message which is caught by the DataLoader for processing.

*Assembly* - Used to process incoming annotation data into Three.js geometry so that it can be rendered by the **CAD View**. 

*CADManager* - Used to manage all events that are aimed at the **CAD view**. Will handle any highlighting of the geometry, necessary exploding of independent pieces of geometry, providing a Three.js raycaster for collision testing, and handling of incoming deltas that need to be applied to the existing geometry.

*DataLoader* - Used to issue all calls to instantiate all components that are necessary from the incoming data such as shells, products, shapes, annotations, etc. Acts as the mediator between the main thread and the active webworkers.

*NC* - Used to perform the rootLoad operation that is triggered by a webworker postMessage with message "rootLoad".  
NC is the housing component for all shell and annotation Three.js geometry.

*Product* - Used to process incoming product data into Three.js geometry so that it can be rendered by the **CAD View**. 

*Shape* - Used to process incoming shape data into Three.js geometry so that it can be rendered by the **CAD View**. 

*Shell* - Used to process incoming shell data into Three.js geometry so that it can be rendered by the **CAD View**. 

*WebWorker* - Background thread of application that is used to process data sent by the DataLoader

# Server Side
---
**api_server.js**

- Used to set the API server:
  * Setup the express server which is used for all routing of the application
  * Setup the socket server for communication from server to client  
  * Link to the core server using util.inherits
  * Setup the static site that is served with each view
  * Setup all routes within the applicaiton
  * Run the application and being listening on the specified port in config.js

**core_server.js**

- Used to set the Core server:
    + Commander package is used to deal with command line options and adding a .option(<path>, <description>) adds another command line option to the app
    + config.js is loaded here as well to set all options and flags that are specified
    + The file being used for the entire simulation is set through this.project
    + The machine used for the entire project is set through this.machinetool
    + file.init(this.project, this.machinetool) initializes the StepNC finder, machinestate, tolerance, and aptstepmaker objects for the entire application and can be accessed by requiring ('file') 
        * file.ms = machineState
        * file.tol = tolerance
        * file.find = finder
        * file.apt = aptstepmaker
    + Winston logger is used throughout the app for debugging purposes

**views/**

Contains any server side views that will be rendered upon first starting the server. Base.jade is used to carry over the appConfig that is instantiated in API server.

**api/**

All api endpoints are stored in here and are thoroughly described in docs/API.md 