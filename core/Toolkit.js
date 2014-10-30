/*
 * Copyright (c) 2013-2014 Minkyu Lee. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the
 * property of Minkyu Lee. The intellectual and technical concepts
 * contained herein are proprietary to Minkyu Lee and may be covered
 * by Republic of Korea and Foreign Patents, patents in process,
 * and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Minkyu Lee (niklaus.lee@gmail.com).
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define*/

define(function (require, exports, module) {
    "use strict";

    var Point      = require("core/Graphics").Point,
        Rect       = require("core/Graphics").Rect,
        Color      = require("core/Graphics").Color,
        Font       = require("core/Graphics").Font,
        ZoomFactor = require("core/Graphics").ZoomFactor,
        GridFactor = require("core/Graphics").GridFactor,
        Points     = require("core/Graphics").Points,
        Coord      = require("core/Graphics").Coord,
        Canvas     = require("core/Graphics").Canvas;

    /**************************************************************************
     *                                                                        *
     *                       CONSTANTS AND ENUMERATIONS                       *
     *                                                                        *
     **************************************************************************/

    /**
     * Selection Orientation (North/West/South/East)
     * @const {number}
     */
    var NWSE_N = 0,
        NWSE_S = 1,
        NWSE_W = 2,
        NWSE_E = 3;

    /**
     * Highlighter Position
     * @const {number}
     */
    var CT_LT   = 0,
        CT_LM   = 1,
        CT_LB   = 2,
        CT_MT   = 3,
        CT_MB   = 4,
        CT_RT   = 5,
        CT_RM   = 6,
        CT_RB   = 7,
        CT_AREA = 8,
        CT_ELSE = 9;

    /**
     * Constants
     * @const
     */
    var HIGHLIGHTER_COLOR             = Color.BLACK,
        SELECTION_COLOR               = "#4f99ff", //Color.GREEN,
        SELECTION_BORDER_COLOR        = "#4f99ff", // Color.GREEN,
        DEFAULT_HIGHLIGHTER_SIZE      = 8.0,
        DEFAULT_HALF_HIGHLIGHTER_SIZE = 4.0,
        DEFAULT_SELECTIONLINE_WIDTH   = DEFAULT_HIGHLIGHTER_SIZE - 1.0;


    function drawEndPoint(canvas, x, y) {
        var r = 5;
        canvas.ellipse(x - r, y - r, x + r, y + r);
    }

    function drawRange(canvas, x1, y1, x2, y2, kind, showEnds) {
        if (kind == null) {
            kind = "rect";
        }
        if (showEnds == null) {
            showEnds = false;
        }

        x1 = Math.round(x1);
        y1 = Math.round(y1);
        x2 = Math.round(x2);
        y2 = Math.round(y2);

        canvas.storeState();
        canvas.context.translate(0.5, 0.5);
        canvas.color = SELECTION_COLOR;
        switch (kind) {
        case "rect":
            canvas.rect(x1, y1, x2, y2);
            if (showEnds) {
                drawEndPoint(canvas, x1, y1);
                drawEndPoint(canvas, x2, y2);
            }
            break;
        case "line":
            canvas.line(x1, y1, x2, y2);
            if (showEnds) {
                drawEndPoint(canvas, x1, y1);
                drawEndPoint(canvas, x2, y2);
            }
            break;
        case "point":
            drawEndPoint(canvas, x2, y2);
            break;
        }
        canvas.context.translate(-0.5, -0.5);
        canvas.restoreState();
    }

    function drawRangeBox(canvas, x1, y1, x2, y2) {
        canvas.storeState();
        canvas.color = SELECTION_COLOR;
        canvas.rect(x1 - 2, y1 - 2, x2 + 3, y2 + 3);
        canvas.restoreState();
    }

    function drawDottedLine(canvas, points) {
        canvas.storeState();
        canvas.context.translate(0.5, 0.5);
        canvas.color = SELECTION_COLOR;
        canvas.polyline(points.points);
        canvas.context.translate(-0.5, -0.5);
        canvas.restoreState();
    }

    function drawSelection(canvas, x1, y1, x2, y2) {
        canvas.storeState();
        canvas.context.translate(0.5, 0.5);
        canvas.fillColor = SELECTION_COLOR;
        canvas.alpha = 0.1;
        canvas.fillRoundRect(x1, y1, x2, y2, 2);
        canvas.color = SELECTION_BORDER_COLOR;
        canvas.alpha = 1;
        canvas.roundRect(x1, y1, x2, y2, 2);
        canvas.context.translate(-0.5, -0.5);
        canvas.restoreState();
    }

    function drawSelectionBox(canvas, x1, y1, x2, y2) {
        canvas.storeState();
        canvas.context.translate(0.5, 0.5);
        canvas.color = SELECTION_BORDER_COLOR;
        canvas.alpha = 1;
        canvas.rect(x1, y1, x2, y2, 2);
        canvas.context.translate(-0.5, -0.5);
        canvas.restoreState();
    }

    function drawSelectionLine(canvas, x1, y1, x2, y2, len, nwse, retouch) {
        var ox, oy, r, r1, r2, rx1, rx2, ry1, ry2;
        canvas.storeState();
        ox = canvas.origin.x;
        oy = canvas.origin.y;
        r1 = new Point(x1, y1);
        r2 = new Point(x2, y2);
        Coord.coordTransform(canvas.zoomFactor, GridFactor.NO_GRID, r1);
        Coord.coordTransform(canvas.zoomFactor, GridFactor.NO_GRID, r2);
        rx1 = r1.x;
        ry1 = r1.y;
        rx2 = r2.x;
        ry2 = r2.y;
        if (retouch && (((rx1 + ox - len) % 2) === 1)) {
            rx1 = rx1 + 1;
        }
        if (retouch && (((rx2 + ox) % 2) === 1)) {
            rx2 = rx2 - 1;
        }
        r = new Rect(0, 0, 0, 0);
        switch (nwse) {
        case NWSE_N:
            r.setRect(rx1 + ox, ry1 + oy - len, rx2 + ox, ry1 + oy);
            break;
        case NWSE_W:
            r.setRect(rx1 + ox - len, ry1 + oy - len, rx1 + ox, ry2 + oy + len);
            break;
        case NWSE_S:
            r.setRect(rx1 + ox, ry2 + oy, rx2 + ox, ry2 + oy + len);
            break;
        case NWSE_E:
            r.setRect(rx2 + ox, ry1 + oy - len, rx2 + ox + len, ry2 + oy + len);
        }
        r.quantize();

        canvas.fillColor = SELECTION_COLOR;
        canvas.alpha = 0.1;
        canvas.coordTransformApplied = false;

        canvas.context.translate(0.5, 0.5);
        canvas.fillRect(r.x1, r.y1, r.x2, r.y2);
        canvas.context.translate(-0.5, -0.5);

        canvas.coordTransformApplied = true;
        canvas.restoreState();
    }

    function drawHighlighter(canvas, x, y, size, enabled, color) {
        var o, p;
        canvas.storeState();
        canvas.color = SELECTION_BORDER_COLOR;
        canvas.fillColor = Color.WHITE;
        canvas.lineWidth = 1.0;
        p = new Point(x, y);
        p.quantize();
        o = canvas.origin.copy();
        Coord.coordTransform(canvas.zoomFactor, GridFactor.NO_GRID, p);
        canvas.coordTransformApplied = false;
        canvas.context.translate(0.5, 0.5);
        canvas.fillRect(p.x + o.x - size, p.y + o.y - size, p.x + o.x + size, p.y + o.y + size);
        canvas.rect(p.x + o.x - size, p.y + o.y - size, p.x + o.x + size, p.y + o.y + size);
        canvas.context.translate(-0.5, -0.5);
        canvas.coordTransformApplied = true;
        canvas.restoreState();
    }

    function drawHighlighter2(canvas, x1, y1, x2, y2, width, cornerType, enabled, color) {
        var cx, cy, halfW, ox, oy, p, p1, p2;
        canvas.storeState();
        canvas.color = color;
        ox = canvas.origin.x;
        oy = canvas.origin.y;
        p1 = new Point(x1, y1);
        p2 = new Point(x2, y2);
        Coord.coordTransform(canvas.zoomFactor, GridFactor.NO_GRID, p1);
        Coord.coordTransform(canvas.zoomFactor, GridFactor.NO_GRID, p2);
        x1 = p1.x;
        y1 = p1.y;
        x2 = p2.x;
        y2 = p2.y;
        p = new Point(-100, -100);
        cx = (x1 + x2) / 2;
        cy = (y1 + y2) / 2;
        halfW = width / 2;
        switch (cornerType) {
        case CT_LT:
            p.setPoint(x1 - width, y1 - width);
            break;
        case CT_LM:
            p.setPoint(x1 - width, cy - halfW);
            break;
        case CT_LB:
            p.setPoint(x1 - width, y2);
            break;
        case CT_MT:
            p.setPoint(cx - halfW, y1 - width);
            break;
        case CT_MB:
            p.setPoint(cx - halfW, y2);
            break;
        case CT_RT:
            p.setPoint(x2, y1 - width);
            break;
        case CT_RM:
            p.setPoint(x2, cy - halfW);
            break;
        case CT_RB:
            p.setPoint(x2, y2);
        }
        if (enabled) {
            canvas.fillColor = Color.WHITE;
        } else {
            canvas.fillColor = "#D0D0D0";
        }

        p.quantize();

        canvas.color = "#4f99ff"; // Color.BLACK;
        canvas.coordTransformApplied = false;

        canvas.context.translate(0.5, 0.5);
        canvas.fillRect(p.x + ox, p.y + oy, p.x + ox + width, p.y + oy + width);
        canvas.rect(p.x + ox, p.y + oy, p.x + ox + width, p.y + oy + width);
        canvas.context.translate(-0.5, -0.5);

        canvas.coordTransformApplied = true;
        canvas.restoreState();
    }

    // Constants
    exports.NWSE_N = NWSE_N;
    exports.NWSE_S = NWSE_S;
    exports.NWSE_W = NWSE_W;
    exports.NWSE_E = NWSE_E;

    exports.CT_LT   = CT_LT;
    exports.CT_LM   = CT_LM;
    exports.CT_LB   = CT_LB;
    exports.CT_MT   = CT_MT;
    exports.CT_MB   = CT_MB;
    exports.CT_RT   = CT_RT;
    exports.CT_RM   = CT_RM;
    exports.CT_RB   = CT_RB;
    exports.CT_AREA = CT_AREA;
    exports.CT_ELSE = CT_ELSE;

    exports.HIGHLIGHTER_COLOR             = HIGHLIGHTER_COLOR;
    exports.SELECTION_COLOR               = SELECTION_COLOR;
    exports.DEFAULT_HIGHLIGHTER_SIZE      = DEFAULT_HIGHLIGHTER_SIZE;
    exports.DEFAULT_HALF_HIGHLIGHTER_SIZE = DEFAULT_HALF_HIGHLIGHTER_SIZE;
    exports.DEFAULT_SELECTIONLINE_WIDTH   = DEFAULT_SELECTIONLINE_WIDTH;

    // Public API
    exports.drawEndPoint      = drawEndPoint;
    exports.drawRange         = drawRange;
    exports.drawRangeBox      = drawRangeBox;
    exports.drawDottedLine    = drawDottedLine;
    exports.drawSelection     = drawSelection;
    exports.drawSelectionBox  = drawSelectionBox;
    exports.drawSelectionLine = drawSelectionLine;
    exports.drawHighlighter   = drawHighlighter;
    exports.drawHighlighter2  = drawHighlighter2;

});
