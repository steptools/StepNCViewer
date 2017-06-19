# NC.js


### Setting up a development environment

  1. Download NC.js:

  ```
  > git clone https://github.com/steptools/NC.js.git
  > cd NC.js
  ```

  ------------------------------------------------------------------------------
  2. Setting up which model to use
  
  Sample AP238 files are available at http://www.ap238.org/  
  In config.js put the path of the STEP-NC file you want to use in the file object
  under the dir key
 
  ```
  "file" : {"dir": "path_to_.stpnc_file"} 
  ```
  ------------------------------------------------------------------------------
  3. Install node packages

  ```
  > npm install
  ```

  ------------------------------------------------------------------------------
  4. Install Glyphicons (Semi-Optional)
  
  If you choose to skip this step, then the application will be missing some icons/buttons.

  ```
  > cd src/client
  > cp ~Downloads/fonts ./fonts
  > ls ./fonts
  glyphicons.scss         glyphicons-regular.svg  glyphicons-regular.woff
  glyphicons-regular.eot  glyphicons-regular.ttf  glyphicons-regular.woff2
  ```

 ------------------------------------------------------------------------------
  5. Making a server
  
  Ensure you are in the root NC.js directory.

  Making a server will build and then start the server

  ```
  > npm run make
  ```

  or, to minimize the file sizes

  ```
  > npm run make-release
  ```
  ------------------------------------------------------------------------------
  6. Start a server

  If a server doesn't need to be rebuilt, this will be faster than making everytime. 

  ```
  > npm start
  ```

  or to use a specific model and overload the config.js
  
   ```
  > npm start -- -f "path_to_.stpnc_file"
  ```
  ------------------------------------------------------------------------------
  7. Open Client
  
  With the server running, point a web browser to
  
  ```
  http://localhost:8080/
  ```
