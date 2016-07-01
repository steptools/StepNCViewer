Version 1.2.0

Features:

- Updated references to reflect new names: STEPNode and NC.js
- Changed internal build structure
- Added properties pane with detailed information about selecting workingstep, tool, tolerance, etc.
- Removed Backbone.js dependency
- Updated endpoint structure to no longer use project ID
- Updated server to now use the command line to specify model to be loaded
- Relative pathing can now be used
- Now supports running only one file
- Pressing escape will close the properties pane
- Added base time and distance to properties pane

Bugfixes:

- Sidebar can now be scrolled in Firefox
- Render radius is properly calculated when workingstep changes
- Bounding boxes update properly with each workingstep
- Tool Loactions now properly update when workingstep changes
- View loads properly without errors on Safari / iOS

Version 1.1.0

- Fixed sidebar text wrapping
- Implemented tabs to switch between list views
- Fixed styling for header
- Added tolerance view
- Changed perspective to be less wacky
- Fixed all assertion errors by making finder,apt, and tol global in file.js
- Stopped showing ids in tolerance view
- removed useles code
- Added tools view
- Replaced references to StepNCNode with NC.js
- Added Changelog
