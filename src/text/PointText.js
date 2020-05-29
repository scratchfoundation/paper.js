/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name PointText
 *
 * @class A PointText item represents a piece of typography in your Paper.js
 * project which starts from a certain point and extends by the amount of
 * characters contained in it.
 *
 * @extends TextItem
 */
var PointText = TextItem.extend(/** @lends PointText# */{
    _class: 'PointText',

    /**
     * Creates a point text item
     *
     * @name PointText#initialize
     * @param {Point} point the position where the text will start
     * @return {PointText} the newly created point text
     *
     * @example {@paperscript}
     * var text = new PointText(new Point(200, 50));
     * text.justification = 'center';
     * text.fillColor = 'black';
     * text.content = 'The contents of the point text';
     */
    /**
     * Creates a point text item from the properties described by an object
     * literal.
     *
     * @name PointText#initialize
     * @param {Object} object an object containing properties describing the
     *     path's attributes
     * @return {PointText} the newly created point text
     *
     * @example {@paperscript}
     * var text = new PointText({
     *     point: [50, 50],
     *     content: 'The contents of the point text',
     *     fillColor: 'black',
     *     fontFamily: 'Courier New',
     *     fontWeight: 'bold',
     *     fontSize: 25
     * });
     */
    initialize: function PointText() {
        TextItem.apply(this, arguments);
    },

    /**
     * The PointText's anchor point
     *
     * @bean
     * @type Point
     */
    getPoint: function() {
        // Se Item#getPosition for an explanation why we create new LinkedPoint
        // objects each time.
        var point = this._matrix.getTranslation();
        return new LinkedPoint(point.x, point.y, this, 'setPoint');
    },

    setPoint: function(/* point */) {
        var point = Point.read(arguments);
        this.translate(point.subtract(this._matrix.getTranslation()));
    },

    _draw: function(ctx, param, viewMatrix) {
        if (!this._content)
            return;
        this._setStyles(ctx, param, viewMatrix);
        var lines = this._lines,
            style = this._style,
            hasFill = style.hasFill(),
            hasStroke = style.hasStroke(),
            leading = style.getLeading(),
            shadowColor = ctx.shadowColor;
        ctx.font = style.getFontStyle();
        ctx.textAlign = style.getJustification();
        for (var i = 0, l = lines.length; i < l; i++) {
            // See Path._draw() for explanation about ctx.shadowColor
            ctx.shadowColor = shadowColor;
            var line = lines[i];
            if (hasFill) {
                ctx.fillText(line, 0, 0);
                ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            if (hasStroke)
                ctx.strokeText(line, 0, 0);
            ctx.translate(0, leading);
        }
    },

    _getBounds: function(matrix, options) {
        var rect = options.drawnTextBounds ? this._getDrawnTextSize() : this._getMeasuredTextSize();
        return matrix ? matrix._transformBounds(rect, rect) : rect;
    },

    _getMeasuredTextSize: function() {
        var style = this._style,
            lines = this._lines,
            numLines = lines.length,
            justification = style.getJustification(),
            leading = style.getLeading(),
            width = this.getView().getTextWidth(style.getFontStyle(), lines),
            x = 0;
        // Adjust for different justifications.
        if (justification !== 'left')
            x -= width / (justification === 'center' ? 2: 1);
        // Until we don't have baseline measuring, assume 1 / 4 leading as a
        // rough guess:
        return new Rectangle(x,
                    numLines ? - 0.75 * leading : 0,
                    width, numLines * leading);
    },

    _getDrawnTextSize: function() {
        var style = this._style;
        var lines = this._lines;
        var numLines = lines.length;
        var leading = style.getLeading();
        var justification = style.getJustification();

        // Create SVG dom element from text
        var svg = SvgElement.create('svg', {
                    version: '1.1',
                    xmlns: SvgElement.svg
                });
        var node = SvgElement.create('text');
        node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
        svg.appendChild(node);
        for (var i = 0; i < numLines; i++) {
            var tspanNode = SvgElement.create('tspan', {
                x: '0',
                dy: i === 0 ? '0' : leading + 'px'
            });
            tspanNode.textContent = this._lines[i];
            node.appendChild(tspanNode);
        }

        // Append to dom
        var element = document.createElement('span');
        element.style.visibility = ('hidden');
        element.style.whiteSpace = 'pre';
        element.style.fontSize = this.fontSize + 'px';
        element.style.fontFamily = this.font;
        element.style.lineHeight = this.leading / this.fontSize;

        // Measure bbox
        var bbox;
        try {
            element.appendChild(svg);
            // Is element width available before appending?
            document.body.appendChild(element);
            // Take the bounding box.
            bbox = svg.getBBox();
        } finally {
            // Always destroy the element, even if, for example, getBBox throws.
            document.body.removeChild(element);
        }

        // Enlarge the bbox from the largest found stroke width
        // This may have false-positives, but at least the bbox will always
        // contain the full graphic including strokes.
        var halfStrokeWidth = this.strokeWidth / 2;
        var width = bbox.width + (halfStrokeWidth * 2);
        var height = bbox.height + (halfStrokeWidth * 2);
        var x = bbox.x - halfStrokeWidth;
        var y = bbox.y - halfStrokeWidth;

        // Adjust for different justifications.
        if (justification !== 'left') {
            var eltWidth = this.getView().getTextWidth(style.getFontStyle(), lines);
            x -= eltWidth / (justification === 'center' ? 2: 1);
        }

        // Add 1 to give space for text cursor
        return new Rectangle(x, y, width + 1, Math.max(height, numLines * leading));
    },

    _hitTestSelf: function(point, options) {
        if (options.fill && (this.hasFill() || options.hitUnfilledPaths) && this._contains(point))
            return new HitResult('fill', this);
    }
});
