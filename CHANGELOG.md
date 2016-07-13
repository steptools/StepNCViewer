Version 1.4.0

Features:
- Keeps entire tool in view when machine is loaded
- Lowlighted Workpieces if no Tolerances are present

Bugfixes:
- View no longer starts upside down on initial load

Reverted:

Version 1.3.0

Features:

- Faces now associated with corresponding geometry
- Added button and keyboard shortcut for aligning view to part (also now default view on startup)
- Tools not used in enabled workingsteps are now dimmed
- Added lock to align view button
- Parent nodes are now highlighted if a child is active and hidden
- Scrolling in sidebar only happens when necessary / only as much as necessary
- Workingsteplist now has setup breakpoints
- WorkplanList now has different color icons for setups
- Tolerance View now displays workpieces and all subcomponents of those workpieces as well as tolerances associated with any of these workpieces
- 404 error page improved 404%!
- Styling overhaul of the sidebar and properties pane

Bugfixes:

- Fixed workplan view not scrolling on tab switch
- Fixed the fixture not moving with the machine tool
- Fixed problem with locking view not rendering immediately
- Fixed view alignment problems with some models and with machine tools
- Fixed broken mobile view / responsiveness after adding locked view
- Part and toolpath geometry move with fixture when needed
- Clicking on workingstep/workplan works with properties pane again
- Workplan will now close correctly nodes that were open before moving to a previous workingstep
- Fixed toggled parent nodes to always highlight if they have an active child regardless 
of the state of the child
- Remove warning on load queue when loading machine tool

Reverted:

- Workingstep list no longer supports property pane. Functionality reverted to v1.1.0

Version 1.2.0

Features:

- Updated references to reflect new names: STEPNode and NC.js
- Changed internal build structure
- Added properties pane with detailed information about selected workingstep, tool, tolerance, etc.
- Removed Backbone.js dependency
- Previous workingstep button enabled
- Updated endpoint structure to no longer use project ID
- Updated server to now use the command line to specify model to be loaded
- Relative pathing can now be used
- Now supports only running one file
- Pressing escape will close the properties pane
- Styling overhaul of the sidebar
- config.json deprecated and moved to config.js

Bugfixes:

- Sidebar now renders only when needed
- Sidebar can now be scrolled in Firefox
- Speed slider is now styled correctly in Edge
- Render radius is properly calculated when workingstep changes
- Bounding boxes update properly with each workingstep
- Tool Locations now properly update when workingstep changes
- View loads properly without errors on Safari / iOS
- Properties pane has correct height for scrolling
- Scrolling happens whenever tab is switched and on all tabs
- Contents of the Workplan tab can no longer be dragged
- Colors stopped working after code refactor but are now fixed
- Nodes in the Workplan tree can no longer be dragged and reordered
- Transitioned to React 15.2.0

Version 1.1.0

- Fixed sidebar text wrapping
- Implemented tabs to switch between list views
- Fixed styling for header
- Added tolerance view
- Changed perspective to be less wacky
- Fixed all assertion errors by making finder,apt, and tol global in file.js
- Stopped showing ids in tolerance view
- Removed useless code
- Added tools view
- Replaced references to StepNCNode with NC.js
- Added Changelog
