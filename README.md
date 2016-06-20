StepNCViewer


Setting up a development environment
====================================

  1. Download and build StepNCNode

  ```
  > git clone https://github.com/steptools/StepNCNode.git
  > cd StepNCNode
  > npm install
  ```

  ------------------------------------------------------------------------------
  2. Clone StepNCViewer into the same directory that contains the StepNCNode
      directory, E.G.:

  ```
  > cd ..
  > git clone https://github.com/steptools/StepNCViewer.git
  > ls
  StepNCNode     StepNCViewer
  ```

  ------------------------------------------------------------------------------
  4. create a new directory in StepNCViewer

  ```
  > cd StepNCViewer
  > mkdir data
  ```

  ------------------------------------------------------------------------------
  5. create a new directory in data for each project

  ```
  > cd data
  > mkdir boxy
  > mkdir moldy
  ```

  ------------------------------------------------------------------------------
  6. Place the projects .stpnc file in the new directory under the name
      model.stpnc

  ```
  > cd boxy
  > cp ~/Downloads/boxy.stpnc ./model.stpnc
  > cd ../moldy
  > cp ~/Downloads/moldy.stpnc ./model.stpnc
  ```

  ------------------------------------------------------------------------------
  7. Create a file named pathmap.json in the data directory that contains a json
      object that contains each project name as a key and path as a value.

  ```
  > cd ..
  > nano pathmap.json
  {
    "boxy" : "c:/.../stepncviewer/data/boxy/model.stpnc",
    "moldy" : "c:/.../StepNCViewer/data/moldy/model.stpnc"
  }
  ```

  ------------------------------------------------------------------------------
  8. Create a key

  ```
  > cd ..
  > ssh-keygen -t rsa -f config/id_rsa
  ```
 
 ------------------------------------------------------------------------------
 9. Install Glyphicons

 ```
 > cd src/client
 > cp ~Downloads/fonts ./fonts
 > cp ~Downloads/glyphicons.scss ./stylesheets/fonts
 ```

  ------------------------------------------------------------------------------
  10. Install nodejs packages

 ```
 > npm install
 ```

  ------------------------------------------------------------------------------
  11. Build/compile using webpack

  #### if you installed webpack globally (`npm install -g webpack`)

 ```
 > webpack
 ```

  #### if you installed webpack via package dependencies (`npm install`)

  ```
  > ./node_modules/.bin/webpack
  ```

  ------------------------------------------------------------------------------
  12. Start a server

  ```
  > npm start
  ```
