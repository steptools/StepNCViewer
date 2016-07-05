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
- Styling overhaul of the sidebar
- config.json deprecated and moved to config.js

Bugfixes:

- Sidebar can now be scrolled in Firefox
- Speed slider is now styled correctly in Edge
- Render radius is properly calculated when workingstep changes
- Bounding boxes update properly with each workingstep
- Tool Loactions now properly update when workingstep changes
- View loads properly without errors on Safari / iOS
- Properties pane has correct height for scrolling
- Scrolling happens whenever tab is switched and on all tabs
- Contents of the Workplan tab can no longer be dragged
- Colors stopped working after code refactor but are now fixed

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
