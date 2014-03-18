# What?
Hey, if your imagination can't extract this information out of the project's title, you may not be able to use it... But yes, it's a pure javascript converter for SVG to PDF.

# Seriously?
Yes! I started this for making PDF export from [svg-edit](http://code.google.com/p/svg-edit) possible.

# Capabilities
It can convert text, lines, rectangles, ellipses and groups of these elements.

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

# Requirements:
* [jsPDF](https://github.com/MrRio/jsPDF)
* [jQuery](http://jquery.org)

# Roadmap:
* Image elements
* multi-page pdf (from svg layers)
* remove bad practices from code
* remove jQuery dependency (or use sth lighter)
* make a demo site with svg-edit
* node.js compatibility (for server-side pdf creation)
