/*
 * svgToPdf.js
 * 
 * Copyright 2012-2014 Florian Hülsmann <fh@cbix.de>
 * Copyright 2014 Ben Gribaudo <www.bengribaudo.com>
 * 
 * This script is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This script is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 * 
 * You should have received a copy of the GNU Lesser General Public License
 * along with this file.  If not, see <http://www.gnu.org/licenses/>.
 * 
 */

var pdfSvgAttr = {
    // allowed attributes. all others are removed from the preview.
    g: ['stroke', 'fill', 'stroke-width'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
    rect: ['x', 'y', 'width', 'height', 'stroke', 'fill', 'stroke-width'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'stroke', 'fill', 'stroke-width'],
    circle: ['cx', 'cy', 'r', 'stroke', 'fill', 'stroke-width'],
    text: ['x', 'y', 'font-size', 'font-family', 'text-anchor', 'font-weight', 'font-style', 'fill']
};

var removeAttributes = function(node, attributes) {
    var toRemove = [];
    $.each(node.attributes, function(i, a) {
        if(typeof(a) != 'undefined' && attributes.indexOf(a.name.toLowerCase()) == -1) {
            toRemove.push(a.name);
        }
    });

    $.each(toRemove, function(i, a) {
        node.removeAttribute(a.name);
    });	
}

var svgElementToPdf = function(element, pdf, options) {
    // pdf is a jsPDF object
    //console.log("options =", options);
    var remove = (typeof(options.removeInvalid) == 'undefined' ? false : options.removeInvalid);
    var k = (typeof(options.scale) == 'undefined' ? 1.0 : options.scale);
    var colorMode = null;
    $(element).children().each(function(i, node) {
        //console.log("passing: ", node);
        var n = $(node);
		var hasFillColor = false;
		var hasStrokeColor = false;
		if(n.is('g,line,rect,ellipse,circle,text')) {
            var fillColor = n.attr('fill');
            if(typeof(fillColor) != 'undefined') {
                var fillRGB = new RGBColor(fillColor);
                if(fillRGB.ok) {
					hasFillColor = true;
                    colorMode = 'F';
                } else {
                    colorMode = null;
                }
            }
        }
        if(n.is('g,line,rect,ellipse,circle')) {
            if(hasFillColor) {
				pdf.setFillColor(fillRGB.r, fillRGB.g, fillRGB.b);
			}
            if(typeof(n.attr('stroke-width')) != 'undefined') {
                pdf.setLineWidth(k * parseInt(n.attr('stroke-width')));
            }
            var strokeColor = n.attr('stroke');
            if(typeof(strokeColor) != 'undefined') {
                var strokeRGB = new RGBColor(strokeColor);
                if(strokeRGB.ok) {
					hasStrokeColor = true;
                    pdf.setDrawColor(strokeRGB.r, strokeRGB.g, strokeRGB.b);
                    if(colorMode == 'F') {
                        colorMode = 'FD';
                    } else {
                        colorMode = null;
                    }
                } else {
                    colorMode = null;
                }
            }
		}
        switch(n.get(0).tagName.toLowerCase()) {
            case 'svg':
            case 'a':
            case 'g':
                svgElementToPdf(node, pdf, options);
                removeAttributes(node, pdfSvgAttr.g);
                break;
            case 'line':
                pdf.line(
                    k*parseInt(n.attr('x1')),
                    k*parseInt(n.attr('y1')),
                    k*parseInt(n.attr('x2')),
                    k*parseInt(n.attr('y2'))
                );
                removeAttributes(node, pdfSvgAttr.line);
                break;
            case 'rect':
                pdf.rect(
                    k*parseInt(n.attr('x')),
                    k*parseInt(n.attr('y')),
                    k*parseInt(n.attr('width')),
                    k*parseInt(n.attr('height')),
                    colorMode
                );
                removeAttributes(node, pdfSvgAttr.rect);
                break;
            case 'ellipse':
                pdf.ellipse(
                    k*parseInt(n.attr('cx')),
                    k*parseInt(n.attr('cy')),
                    k*parseInt(n.attr('rx')),
                    k*parseInt(n.attr('ry')),
                    colorMode
                );
                removeAttributes(node, pdfSvgAttr.ellipse);
                break;
            case 'circle':
                pdf.circle(
                    k*parseInt(n.attr('cx')),
                    k*parseInt(n.attr('cy')),
                    k*parseInt(n.attr('r')),
                    colorMode
                );
                removeAttributes(node, pdfSvgAttr.circle);
                break;
            case 'text':
                if(node.hasAttribute('font-family')) {
                    switch(n.attr('font-family').toLowerCase()) {
                        case 'serif': pdf.setFont('times'); break;
                        case 'monospace': pdf.setFont('courier'); break;
                        default:
                            n.attr('font-family', 'sans-serif');
                            pdf.setFont('helvetica');
                    }
                }
                if(hasFillColor) {
                    pdf.setTextColor(fillRGB.r, fillRGB.g, fillRGB.b);
                }
                var fontType = "";
                if(node.hasAttribute('font-weight')) {
                    if(n.attr('font-weight') == "bold") {
                        fontType = "bold";
                    } else {
                        node.removeAttribute('font-weight');
                    }
                }
                if(node.hasAttribute('font-style')) {
                    if(n.attr('font-style') == "italic") {
                        fontType += "italic";
                    } else {
                        node.removeAttribute('font-style');
                    }
                }
                pdf.setFontType(fontType);
                var pdfFontSize = 16;
				if(node.hasAttribute('font-size')) {
                    pdfFontSize = parseInt(n.attr('font-size'));
                }
                var box = node.getBBox();
                //FIXME: use more accurate positioning!!
                var x, y, xOffset = 0;
                if(node.hasAttribute('text-anchor')) {
                    switch(n.attr('text-anchor')) {
                        case 'end': xOffset = box.width; break;
                        case 'middle': xOffset = box.width / 2; break;
                        case 'start': break;
                        case 'default': n.attr('text-anchor', 'start');
                    }
                    x = parseInt(n.attr('x')) - xOffset;
                    y = parseInt(n.attr('y'));
                }
				//console.log("fontSize:", pdfFontSize, "text:", n.text());
                pdf.setFontSize(pdfFontSize).text(
                    k * x,
                    k * y,
                    n.text()
                );
                removeAttributes(node, pdfSvgAttr.text);
                break;
            //TODO: image
            default:
                if(remove) {
                    console.log("can't translate to pdf:", node);
                    n.remove();
                }
        }
    });
    return pdf;
};

(function(jsPDFAPI) {
'use strict';

    jsPDFAPI.addSVG = function(element, x, y, options) {
        'use strict'

        options = (typeof(options) == 'undefined' ? {} : options);
        options.x_offset = x;
        options.y_offset = y;

        svgElementToPdf(element, this, options);
        return this;
    };
})(jsPDF.API);
