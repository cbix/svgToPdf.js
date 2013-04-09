# What?
We took the work done by CBiX and added functionality for svg paths among other small changes.


# Capabilities
It can convert text, lines, rectangles, ellipses and groups of these elements. (AND PATHS!)

# Usage
    // I recommend to keep the svg visible as a preview
    var svg = $('#container > svg').get(0);
	// you should set the format dynamically, write [width, height] instead of 'a4'
	var pdf = new jsPDF('p', 'pt', 'a4');
	svgElementToPdf(svg, pdf, {
		scale: 72/96, // this is the ratio of px to pt units
		removeInvalid: true // this removes elements that could not be translated to pdf from the source svg
	});
	pdf.output('datauri'); // use output() to get the jsPDF buffer

# Special thanks
* [CBiX](https://github.com/CBiX/svgToPdf.js)

# Requirements:
* [jsPDF](https://github.com/MrRio/jsPDF)
* [jQuery](http://jquery.org)
* [underscore](http://underscorejs.org)
