StepNCViewer


Setting up a development environment
====================================
     
  1. git clone https://github.com/steptools/StepNCNode

     ----------------
  2. build StepNCNode

       ```
       node-gyp configure
       node-gyp build
       ```

     -----------------------------------------------------------------------------------------
  3. git clone https://github.com/steptools/StepNCViewer into the same directory that contains
     /StepNCNode

     ------------------------------------------
  4. create a new directory in ../StepNCViewer

       ```
       mkdir data
       ```

     -----------------------------------------------
  5. create a new directory in data for each project

       ```
       mkdir project
       ```

     ------------------------------------------------------------------------------
  6. Place the projects .stpnc file in the new directory under the name model.stpnc

     ---------------------------------------------------------------------------------------
  7. Create a file named pathmap.json in the data directory that contains a json object that 
     contains each project name as a key and path as a value.
       
       {
       "project" : "c:/.../stepncviewer/data/project/model.stpnc"
       }

    ------------
  8. Create a key

       ```
       ssh-keygen -t rsa -f config/id_rsa
       ```

     ------------------------
  9. Install nodejs packages

       ```
       npm install
       ```
       
     ---------------------------
  10. Build/compile using webpack

       # if you installed webpack globally (`npm install -g webpack`)
       webpack

       # if you installed webpack via package dependencies (`npm install`)
       ./node_modules/.bin/webpack

     --------------    
  11. Start a server

       ```
       npm start 
       ```