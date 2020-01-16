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
    g: ['stroke', 'fill', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
    rect: ['x', 'y', 'width', 'height', 'stroke', 'fill', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'stroke', 'fill', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
    circle: ['cx', 'cy', 'r', 'stroke', 'fill', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
    polygon: ['points', 'stroke', 'fill', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
    // polyline attributes are the same as those of polygon
    path: ['d', 'stroke', 'fill', 'stroke-width', 'stroke-opacity', 'fill-opacity'],
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
};


var numRgx = /[+-]?(?:\d+\.\d*|\d+|\.\d+)(?:[eE]\d+|[eE][+-]\d+|)/g;
var getLinesOptionsOfPoly = function (node) {
    var nums = node.getAttribute('points');
    nums = (nums && nums.match(numRgx)) || [];
    if (nums && nums.length) {
        nums = nums.map((n) => Number(n));
        if (nums.length % 2) {
            nums.length--;
        }
    }
    if (nums.length < 4) {
        // console.log('invalid points attribute:', node);
        return;
    }
    var x = nums[0], y = nums[1], lines = [];
    for (var i = 2; i < nums.length; i += 2) {
        lines.push([nums[i] - nums[i - 2], nums[i + 1] - nums[i - 1]]);
    }
    return { x: x, y: y, lines: lines };
};

// please add pathseg polyfill to support path elements. https://github.com/progers/pathseg
var getLinesOptionsOfPath = function (node) {
    if (!node || node.tagName != 'path') {
        return [];
    }
    if (!node.pathSegList || !node.pathSegList.getItem) {
        throw new Error('please add pathseg polyfill to support path elements. https://github.com/progers/pathseg');
        // return [];
    }
    var segList = node.pathSegList, n = segList.numberOfItems, opsList = [];
    var ops = {
        lines: []
    };
    var curr = { x: 0, y: 0 };
    var reflectControl = { x: 0, y: 0 };
    var toRelative = function (nums, relativeTo) {
        var re = [];
        for (var i = 0; i < nums.length - 1; i += 2) {
            re[i] = nums[i] - relativeTo.x;
            re[i + 1] = nums[i + 1] - relativeTo.y;
        }
        return re;
    };
    var curveQToC = function (nums) {
        var a = 2 / 3;
        var re = [
            nums[0] * a,
            nums[1] * a,
            nums[2] + (nums[0] - nums[2]) * a,
            nums[3] + (nums[1] - nums[3]) * a,
            nums[2],
            nums[3]
        ];
        return re;
    };
    for (var i = 0, letterPrev; i < n; i++) {
        var seg = segList.getItem(i);
        var letter = seg.pathSegTypeAsLetter;
        var x1 = seg.x1, y1 = seg.y1, x2 = seg.x2, y2 = seg.y2, x = seg.x, y = seg.y;
        var isRelative = letter >= 'a'; // lowercase letter
        switch (letter) {
            case 'M':
            case 'm': {
                if (ops.lines.length && Object.prototype.hasOwnProperty.call(ops, 'x')) {
                    opsList.push(ops);
                }
                ops = {
                    lines: [],
                    x: isRelative ? x + curr.x : x,
                    y: isRelative ? y + curr.y : y,
                    closed: false
                };
                ops.closed = false;
                break;
            }
            case 'L': {
                ops.lines.push(toRelative([x, y], curr));
                break;
            }
            case 'l': {
                ops.lines.push([x, y]);
                break;
            }
            case 'H': {
                ops.lines.push([x - curr.x, 0]);
                break;
            }
            case 'h': {
                ops.lines.push([x, 0]);
                break;
            }
            case 'V': {
                ops.lines.push([0, y - curr.y]);
                break;
            }
            case 'v': {
                ops.lines.push([0, y]);
                break;
            }
            case 'Q': {
                ops.lines.push(curveQToC(toRelative([x1, y1, x, y], curr)));
                reflectControl.x = x - x1;
                reflectControl.y = y - y1;
                break;
            }
            case 'q': {
                ops.lines.push(curveQToC([x1, y1, x, y]));
                reflectControl.x = x - x1;
                reflectControl.y = y - y1;
                break;
            }
            case 'T': {
                var p1 = letterPrev && 'QqTt'.includes(letterPrev) ? reflectControl : { x: 0, y: 0 };
                ops.lines.push(curveQToC([p1.x, p1.y, x - curr.x, y - curr.y]));
                reflectControl.x = x - curr.x - p1.x;
                reflectControl.y = y - curr.y - p1.y;
                break;
            }
            case 't': {
                var p1 = letterPrev && 'QqTt'.includes(letterPrev) ? reflectControl : { x: 0, y: 0 };
                ops.lines.push([p1.x, p1.y, x, y]);
                reflectControl.x = x - p1.x;
                reflectControl.y = y - p1.y;
                break;
            }
            case 'C': {
                ops.lines.push(toRelative([x1, y1, x2, y2, x, y], curr));
                break;
            }
            case 'c': {
                ops.lines.push([x1, y1, x2, y2, x, y]);
                break;
            }
            case 'S':
            case 's': {
                var p1 = letterPrev && 'CcSs'.includes(letterPrev) ? reflectControl : { x: 0, y: 0 };
                if (isRelative) {
                    ops.lines.push([p1.x, p1.y, x2, y2, x, y]);
                } else {
                    ops.lines.push([p1.x, p1.y].concat(toRelative([x2, y2, x, y], curr)));
                }
                reflectControl.x = x - x2;
                reflectControl.y = y - y2;
                break;
            }
            case 'A':
            case 'a': {
                // Not support command 'A' and 'a' yet. Treat it as straight line instead.
                if (isRelative) {
                    ops.lines.push([x, y]);
                } else {
                    ops.lines.push(toRelative([x, y], curr));
                }
                break;
            }
            case 'z':
            case 'Z': {
                ops.closed = true;
                break;
            }
            default: {
                // throw new Error('Unknown path command ' + letter);
                return opsList;
            }
        }
        if (letter === 'Z' || letter === 'z') {
            curr.x = ops.x;
            curr.y = ops.y;
        } else {
            if (letter !== 'V' && letter !== 'v') {
                curr.x = isRelative ? x + curr.x : x;
            }
            if (letter !== 'H' && letter !== 'h') {
                curr.y = isRelative ? y + curr.y : y;
            }
        }
        letterPrev = letter;
    }
    if (ops.lines.length && Object.prototype.hasOwnProperty.call(ops, 'x')) {
        opsList.push(ops);
    }
    return opsList;
};

var svgElementToPdf = function(element, pdf, options) {
    // pdf is a jsPDF object
    //console.log("options =", options);
    var remove = (typeof(options.removeInvalid) == 'undefined' ? false : options.removeInvalid);
    var k = (typeof(options.scale) == 'undefined' ? 1.0 : options.scale);
    $(element).children().each(function(i, node) {
        //console.log("passing: ", node);
        var n = $(node);
        var hasFillColor = false;
        var hasStrokeColor = false;
        var colorMode = null;
        if(n.is('g,line,rect,ellipse,circle,polygon,polyline,path,text')) {
            var fillColor = n.attr('fill');
            if(typeof(fillColor) != 'undefined' && fillColor != 'none' && n.attr('fill-opacity') !== '0') {
                var fillRGB = new RGBColor(fillColor);
                if(fillRGB.ok) {
                    hasFillColor = true;
                    colorMode = 'F';
                } else {
                    colorMode = null;
                }
            }
        }
        if(n.is('g,line,rect,ellipse,circle,polygon,polyline,path')) {
            if(hasFillColor) {
                pdf.setFillColor(fillRGB.r, fillRGB.g, fillRGB.b);
            }
            var hasStrokeWidth = false;
            if(typeof(n.attr('stroke-width')) != 'undefined' && n.attr('stroke-width') !== '0' && n.attr('stroke-opacity') !== '0') {
                pdf.setLineWidth(k * parseInt(n.attr('stroke-width')));
                hasStrokeWidth = true;
            }
            var strokeColor = n.attr('stroke');
            if(typeof(strokeColor) != 'undefined' && strokeColor != 'none' && hasStrokeWidth) {
                var strokeRGB = new RGBColor(strokeColor);
                if(strokeRGB.ok) {
                    hasStrokeColor = true;
                    pdf.setDrawColor(strokeRGB.r, strokeRGB.g, strokeRGB.b);
                    if(hasFillColor) {
                        colorMode = 'FD';
                    } else {
                        colorMode = 'S';
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
            case 'polygon':
            case 'polyline':
                var linesOptions = getLinesOptionsOfPoly(node);
                if (linesOptions) {
                    pdf.lines(
                        linesOptions.lines,
                        k * linesOptions.x,
                        k * linesOptions.y,
                        [k, k],
                        colorMode,
                        tag === 'polygon' // polygon is closed, polyline is not closed
                    );
                }
                removeAttributes(node, pdfSvgAttr.polygon);
                break;
            case 'path':
                if (colorMode) {
                    var linesOptionsList = getLinesOptionsOfPath(node);
                    if (linesOptionsList.length > 0) {
                        linesOptionsList.forEach(function (linesOptions) {
                            pdf.lines(
                                linesOptions.lines,
                                k * linesOptions.x,
                                k * linesOptions.y,
                                [k, k],
                                null,
                                linesOptions.closed
                            );
                        });
                        // svg fill rule default is nonzero
                        var fillRule = n.attr('fill-rule');
                        if (fillRule === 'evenodd') {
                            // f* : fill using even-odd rule
                            // B* : stroke and fill using even-odd rule
                            if (colorMode === 'F') {
                                colorMode = 'f*';
                            } else if (colorMode === 'FD') {
                                colorMode = 'B*';
                            }
                        }
                        pdf.internal.write(pdf.internal.getStyle(colorMode));
                    }
                }
                removeAttributes(node, pdfSvgAttr.path);
                break;
            case 'text':
                if(node.hasAttribute('font-family')) {
                    switch(n.attr('font-family').toLowerCase()) {
                        case 'serif': pdf.setFont('times'); break;
                        case 'monospace': pdf.setFont('courier'); break;
                        case 'times': pdf.setFont('times'); break;
                        case 'courier': pdf.setFont('courier'); break;
                        case 'helvetica': pdf.setFont('helvetica'); break;
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

        if (typeof element === 'string') {
            element = new DOMParser().parseFromString(element, 'text/xml').documentElement;
        }
        svgElementToPdf(element, this, options);
        return this;
    };
})(jsPDF.API);
