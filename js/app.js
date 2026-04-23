(function() {
	"use strict";

	var MAX_UNITS = 9;
	var BOX_ID_SEQ = 2;
	var DEFAULT_LABEL_COLOR = "#1e293b";
	var BOX_PALETTE = ["#3d9ee8", "#57cc99", "#f95738", "#f4b400", "#8b5cf6", "#ef6f9f"];

	var CANVAS = {
		width: 1050,
		height: 800,
		originX: 430.5,
		originY: 430.5
	};

	var STEP = {
		x: 50,
		y: 50,
		zx: -25,
		zy: 25
	};

	var viewState = {
		scale: 1,
		offsetX: 0,
		offsetY: 0,
		minScale: 0.45,
		maxScale: 2.75,
		isPanning: false,
		panStartX: 0,
		panStartY: 0
	};

	var labelStore = {
		x: [],
		y: [],
		z: []
	};

	function isNumber(n) {
		return !isNaN(parseFloat(n)) && isFinite(n);
	}

	function clampInt(value, min, max, fallback) {
		var num = parseInt(value, 10);
		if (!isNumber(num)) {
			return fallback;
		}
		if (num < min) {
			return min;
		}
		if (num > max) {
			return max;
		}
		return num;
	}

	function clampFloat(value, min, max, fallback) {
		var num = parseFloat(value);
		if (!isNumber(num)) {
			return fallback;
		}
		if (num < min) {
			return min;
		}
		if (num > max) {
			return max;
		}
		return num;
	}

	function hexToRgb(hex) {
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
		hex = String(hex || "").replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}

	function normalizeHexColor(hex, fallback) {
		var rgb = hexToRgb(hex);
		if (!rgb) {
			return fallback;
		}
		var toHex = function(value) {
			var h = value.toString(16);
			return h.length === 1 ? "0" + h : h;
		};
		return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
	}

	function rgbaFromHex(hex, alpha, fallbackHex) {
		var rgb = hexToRgb(normalizeHexColor(hex, fallbackHex || "#3d9ee8"));
		return "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + alpha + ")";
	}

	function scaleRgb(rgb, factor) {
		return {
			r: Math.max(0, Math.min(255, Math.round(rgb.r * factor))),
			g: Math.max(0, Math.min(255, Math.round(rgb.g * factor))),
			b: Math.max(0, Math.min(255, Math.round(rgb.b * factor)))
		};
	}

	function rgbToHex(rgb) {
		var toHex = function(value) {
			var h = value.toString(16);
			return h.length === 1 ? "0" + h : h;
		};
		return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
	}

	function getShadeColor(hex, factor) {
		var rgb = hexToRgb(normalizeHexColor(hex, "#3d9ee8"));
		return rgbToHex(scaleRgb(rgb, factor));
	}

	function applyViewTransform(point) {
		return {
			x: (point.x * viewState.scale) + viewState.offsetX,
			y: (point.y * viewState.scale) + viewState.offsetY
		};
	}

	function project(coord) {
		var base = {
			x: CANVAS.originX + (coord.x * STEP.x) + (coord.z * STEP.zx),
			y: CANVAS.originY - (coord.y * STEP.y) + (coord.z * STEP.zy)
		};
		return applyViewTransform(base);
	}

	function getCanvasPoint(event) {
		var canvas = document.getElementById("c");
		var rect = canvas.getBoundingClientRect();
		return {
			x: (event.clientX - rect.left) * (canvas.width / rect.width),
			y: (event.clientY - rect.top) * (canvas.height / rect.height)
		};
	}

	function drawPolyline(context, points, closePath, fillStyle, strokeStyle, lineWidth) {
		if (!points.length) {
			return;
		}
		context.beginPath();
		context.moveTo(points[0].x, points[0].y);
		for (var i = 1; i < points.length; i++) {
			context.lineTo(points[i].x, points[i].y);
		}
		if (closePath) {
			context.closePath();
		}
		if (fillStyle) {
			context.fillStyle = fillStyle;
			context.fill();
		}
		if (strokeStyle) {
			context.strokeStyle = strokeStyle;
			context.lineWidth = lineWidth || 1;
			context.stroke();
		}
	}

	function getAxisCount(inputId) {
		var current = $("#" + inputId).val();
		var clamped = clampInt(current, 0, MAX_UNITS, 0);
		$("#" + inputId).val(clamped);
		return clamped;
	}

	function captureLabelStoreFromDom() {
		$(".xlabel textarea, .xlabel input").each(function(index) {
			labelStore.x[index] = $(this).val();
		});
		$(".ylabel textarea, .ylabel input").each(function(index) {
			labelStore.y[index] = $(this).val();
		});
		$(".zlabel textarea, .zlabel input").each(function(index) {
			labelStore.z[index] = $(this).val();
		});
	}

	function normalizeLabelLines(text) {
		return String(text || "")
			.replace(/\\r\\n/g, "\n")
			.split("\n")
			.filter(function(line) {
				return line.trim() !== "";
			});
	}

	function drawMultilineText(context, text, x, y, lineHeight) {
		var lines = normalizeLabelLines(text);
		if (!lines.length) {
			return;
		}
		for (var i = 0; i < lines.length; i++) {
			context.fillText(lines[i], x, y + (i * lineHeight));
		}
	}

	function getAxisTextValues(axisPrefix, count) {
		var values = [];
		var source = labelStore[axisPrefix] || [];
		for (var i = 1; i <= count; i++) {
			var fallback = axisPrefix + i;
			values.push(source[i - 1] || fallback);
		}
		return values;
	}

	function getLimits(boxes, xCount, yCount, zCount) {
		var maxX = Math.max(1, xCount);
		var maxY = Math.max(1, yCount);
		var maxZ = Math.max(1, zCount);

		for (var i = 0; i < boxes.length; i++) {
			var box = boxes[i];
			maxX = Math.max(maxX, box.ox + box.sx);
			maxY = Math.max(maxY, box.oy + box.sy);
			maxZ = Math.max(maxZ, box.oz + box.sz);
		}

		return {
			x: Math.min(MAX_UNITS, maxX),
			y: Math.min(MAX_UNITS, maxY),
			z: Math.min(MAX_UNITS, maxZ)
		};
	}

	function drawGrid(context, limits) {
		if (!$(".grid").is(":checked")) {
			return;
		}

		context.save();
		context.setLineDash([4, 6]);

		var x;
		var y;
		var z;
		for (y = 0; y <= limits.y; y++) {
			for (z = 0; z <= limits.z; z++) {
				drawPolyline(context, [
					project({ x: 0, y: y, z: z }),
					project({ x: limits.x, y: y, z: z })
				], false, null, "rgba(145, 164, 186, 0.2)", 0.9);
			}
		}
		for (x = 0; x <= limits.x; x++) {
			for (z = 0; z <= limits.z; z++) {
				drawPolyline(context, [
					project({ x: x, y: 0, z: z }),
					project({ x: x, y: limits.y, z: z })
				], false, null, "rgba(145, 164, 186, 0.2)", 0.9);
			}
		}
		for (x = 0; x <= limits.x; x++) {
			for (y = 0; y <= limits.y; y++) {
				drawPolyline(context, [
					project({ x: x, y: y, z: 0 }),
					project({ x: x, y: y, z: limits.z })
				], false, null, "rgba(145, 164, 186, 0.2)", 0.9);
			}
		}

		context.restore();
	}

	function drawAxes(context, limits) {
		var origin = project({ x: 0, y: 0, z: 0 });
		var xEnd = project({ x: limits.x, y: 0, z: 0 });
		var yEnd = project({ x: 0, y: limits.y, z: 0 });
		var zEnd = project({ x: 0, y: 0, z: limits.z });

		drawPolyline(context, [origin, xEnd], false, null, "#1f2937", 1.5);
		drawPolyline(context, [origin, yEnd], false, null, "#1f2937", 1.5);
		drawPolyline(context, [origin, zEnd], false, null, "#1f2937", 1.5);

		var i;
		for (i = 1; i <= limits.x; i++) {
			var tx = project({ x: i, y: 0, z: 0 });
			drawPolyline(context, [{ x: tx.x, y: tx.y - 4 }, { x: tx.x, y: tx.y + 4 }], false, null, "#1f2937", 1);
		}
		for (i = 1; i <= limits.y; i++) {
			var ty = project({ x: 0, y: i, z: 0 });
			drawPolyline(context, [{ x: ty.x - 4, y: ty.y }, { x: ty.x + 4, y: ty.y }], false, null, "#1f2937", 1);
		}
		for (i = 1; i <= limits.z; i++) {
			var tz = project({ x: 0, y: 0, z: i });
			drawPolyline(context, [{ x: tz.x - 4, y: tz.y + 2 }, { x: tz.x + 4, y: tz.y - 2 }], false, null, "#1f2937", 1);
		}

		context.font = "bold 13px 'IBM Plex Sans'";
		context.fillStyle = "#0f172a";
		context.textAlign = "left";
		context.fillText("Clienti (x)", xEnd.x + 14, xEnd.y + 5);
		context.fillText("Bisogni (y)", yEnd.x - 10, yEnd.y - 16);
		context.fillText("Modalità/Tecnologie (z)", zEnd.x - 160, zEnd.y + 16);
	}

	function drawAxisLabels(context, counts) {
		var xTexts = getAxisTextValues("x", counts.x);
		var yTexts = getAxisTextValues("y", counts.y);
		var zTexts = getAxisTextValues("z", counts.z);

		context.font = "600 12px 'IBM Plex Sans'";
		context.fillStyle = DEFAULT_LABEL_COLOR;

		var i;
		for (i = 1; i <= counts.x; i++) {
			var px = project({ x: i - 0.5, y: 0, z: 0 });
			context.save();
			context.translate(px.x, px.y + 10);
			context.rotate(-Math.PI / 4);
			context.textAlign = "right";
			drawMultilineText(context, xTexts[i - 1], 0, 0, 13);
			context.restore();
		}

		context.textAlign = "right";
		for (i = 1; i <= counts.y; i++) {
			var py = project({ x: 0, y: i - 0.5, z: 0 });
			drawMultilineText(context, yTexts[i - 1], py.x - 12, py.y + 4, 13);
		}

		context.textAlign = "right";
		for (i = 1; i <= counts.z; i++) {
			var pz = project({ x: 0, y: 0, z: i - 0.5 });
			drawMultilineText(context, zTexts[i - 1], pz.x - 12, pz.y + 4, 13);
		}
	}

	function getBoxFaceColors(boxColor) {
		var base = normalizeHexColor(boxColor, BOX_PALETTE[0]);
		return {
			front: rgbaFromHex(getShadeColor(base, 1.05), 0.44, base),
			side: rgbaFromHex(getShadeColor(base, 0.85), 0.5, base),
			top: rgbaFromHex(getShadeColor(base, 1.2), 0.4, base),
			edge: rgbaFromHex(getShadeColor(base, 0.55), 0.9, base)
		};
	}

	function drawSingleBox(context, box) {
		var colors = getBoxFaceColors(box.color);
		var p000 = project({ x: box.ox, y: box.oy, z: box.oz });
		var p100 = project({ x: box.ox + box.sx, y: box.oy, z: box.oz });
		var p010 = project({ x: box.ox, y: box.oy + box.sy, z: box.oz });
		var p110 = project({ x: box.ox + box.sx, y: box.oy + box.sy, z: box.oz });
		var p001 = project({ x: box.ox, y: box.oy, z: box.oz + box.sz });
		var p101 = project({ x: box.ox + box.sx, y: box.oy, z: box.oz + box.sz });
		var p011 = project({ x: box.ox, y: box.oy + box.sy, z: box.oz + box.sz });
		var p111 = project({ x: box.ox + box.sx, y: box.oy + box.sy, z: box.oz + box.sz });

		drawPolyline(context, [p010, p110, p111, p011], true, colors.top, null, 1);
		drawPolyline(context, [p100, p110, p111, p101], true, colors.side, null, 1);
		drawPolyline(context, [p001, p101, p111, p011], true, colors.front, null, 1);

		var edges = [
			[p000, p100], [p000, p010], [p000, p001],
			[p100, p110], [p100, p101],
			[p010, p110], [p010, p011],
			[p001, p101], [p001, p011],
			[p111, p110], [p111, p101], [p111, p011]
		];

		for (var i = 0; i < edges.length; i++) {
			drawPolyline(context, [edges[i][0], edges[i][1]], false, null, colors.edge, 1.2);
		}
	}

	function drawBoxes(context, boxes) {
		var sorted = boxes.slice().sort(function(a, b) {
			return (a.ox + a.oy + a.oz) - (b.ox + b.oy + b.oz);
		});
		for (var i = 0; i < sorted.length; i++) {
			drawSingleBox(context, sorted[i]);
		}
	}

	function normalizeBoxValues(row, fallbackColor) {
		var box = {
			ox: clampInt(row.find(".box-ox").val(), 0, MAX_UNITS, 0),
			oy: clampInt(row.find(".box-oy").val(), 0, MAX_UNITS, 0),
			oz: clampInt(row.find(".box-oz").val(), 0, MAX_UNITS, 0),
			sx: clampInt(row.find(".box-sx").val(), 1, MAX_UNITS, 1),
			sy: clampInt(row.find(".box-sy").val(), 1, MAX_UNITS, 1),
			sz: clampInt(row.find(".box-sz").val(), 1, MAX_UNITS, 1),
			color: normalizeHexColor(row.find(".box-color").val(), fallbackColor)
		};

		if ((box.ox + box.sx) > MAX_UNITS) {
			box.sx = Math.max(1, MAX_UNITS - box.ox);
		}
		if ((box.oy + box.sy) > MAX_UNITS) {
			box.sy = Math.max(1, MAX_UNITS - box.oy);
		}
		if ((box.oz + box.sz) > MAX_UNITS) {
			box.sz = Math.max(1, MAX_UNITS - box.oz);
		}

		row.find(".box-ox").val(box.ox);
		row.find(".box-oy").val(box.oy);
		row.find(".box-oz").val(box.oz);
		row.find(".box-sx").val(box.sx);
		row.find(".box-sy").val(box.sy);
		row.find(".box-sz").val(box.sz);
		row.find(".box-color").val(box.color);

		return box;
	}

	function collectBoxes() {
		var rows = $("#boxes-container .box-row");
		var boxes = [];
		rows.each(function(index) {
			var fallback = BOX_PALETTE[index % BOX_PALETTE.length];
			boxes.push(normalizeBoxValues($(this), fallback));
		});

		if (!boxes.length) {
			boxes.push({ ox: 0, oy: 0, oz: 0, sx: 1, sy: 1, sz: 1, color: BOX_PALETTE[0] });
		}
		return boxes;
	}

	function addLabelInputGroup(selector, axisPrefix, count) {
		var container = $(selector);
		container.html("");
		var axisStore = labelStore[axisPrefix] || [];
		for (var i = 1; i <= count; i++) {
			var value = axisStore[i - 1] || (axisPrefix + i);
			container.append('<label for="' + axisPrefix + i + '">' + axisPrefix + i + '</label><textarea class="' + axisPrefix + i + '" id="' + axisPrefix + i + '" rows="2">' + value + '</textarea>');
		}
	}

	function getFields() {
		captureLabelStoreFromDom();
		var xfields = getAxisCount("xfields");
		var yfields = getAxisCount("yfields");
		var zfields = getAxisCount("zfields");

		addLabelInputGroup(".xlabel", "x", xfields);
		addLabelInputGroup(".ylabel", "y", yfields);
		addLabelInputGroup(".zlabel", "z", zfields);
	}

	function renumberBoxes() {
		$("#boxes-container .box-row").each(function(index) {
			$(this).find(".box-title").text("Box " + (index + 1));
		});
	}

	function addBoxRow(data) {
		var box = data || {
			ox: 0,
			oy: 0,
			oz: 0,
			sx: 1,
			sy: 1,
			sz: 1,
			color: BOX_PALETTE[$("#boxes-container .box-row").length % BOX_PALETTE.length]
		};

		var boxId = BOX_ID_SEQ++;
		var html = '' +
			'<div class="box-row">' +
				'<div class="box-head">' +
					'<strong class="box-title">Box</strong>' +
					'<button type="button" class="remove-box">Rimuovi</button>' +
				'</div>' +
				'<div class="box-grid">' +
					'<label for="box-' + boxId + '-ox">Origine x</label><input type="number" id="box-' + boxId + '-ox" class="box-ox" min="0" max="9" value="' + box.ox + '" />' +
					'<label for="box-' + boxId + '-oy">Origine y</label><input type="number" id="box-' + boxId + '-oy" class="box-oy" min="0" max="9" value="' + box.oy + '" />' +
					'<label for="box-' + boxId + '-oz">Origine z</label><input type="number" id="box-' + boxId + '-oz" class="box-oz" min="0" max="9" value="' + box.oz + '" />' +
					'<label for="box-' + boxId + '-sx">Dim x</label><input type="number" id="box-' + boxId + '-sx" class="box-sx" min="1" max="9" value="' + box.sx + '" />' +
					'<label for="box-' + boxId + '-sy">Dim y</label><input type="number" id="box-' + boxId + '-sy" class="box-sy" min="1" max="9" value="' + box.sy + '" />' +
					'<label for="box-' + boxId + '-sz">Dim z</label><input type="number" id="box-' + boxId + '-sz" class="box-sz" min="1" max="9" value="' + box.sz + '" />' +
					'<label for="box-' + boxId + '-color">Colore box</label><input type="color" id="box-' + boxId + '-color" class="box-color" value="' + normalizeHexColor(box.color, BOX_PALETTE[0]) + '" />' +
				'</div>' +
			'</div>';

		$("#boxes-container").append(html);
		renumberBoxes();
	}

	function clearBoxes() {
		$("#boxes-container").html("");
	}

	function drawGraph() {
		captureLabelStoreFromDom();
		var canvas = document.getElementById("c");
		var context = canvas.getContext("2d");
		context.clearRect(0, 0, canvas.width, canvas.height);

		var counts = {
			x: getAxisCount("xfields"),
			y: getAxisCount("yfields"),
			z: getAxisCount("zfields")
		};

		var boxes = collectBoxes();
		var limits = getLimits(boxes, counts.x, counts.y, counts.z);

		drawGrid(context, limits);
		drawAxes(context, limits);
		drawBoxes(context, boxes);
		drawAxisLabels(context, counts);
	}

	function serializeState() {
		captureLabelStoreFromDom();
		return {
			version: 1,
			grid: $(".grid").is(":checked"),
			view: {
				scale: viewState.scale,
				offsetX: viewState.offsetX,
				offsetY: viewState.offsetY
			},
			labelCounts: {
				x: getAxisCount("xfields"),
				y: getAxisCount("yfields"),
				z: getAxisCount("zfields")
			},
			labels: {
				x: labelStore.x,
				y: labelStore.y,
				z: labelStore.z
			},
			boxes: collectBoxes()
		};
	}

	function loadState(state) {
		if (!state || typeof state !== "object") {
			throw new Error("JSON non valido.");
		}

		var counts = state.labelCounts || {};
		$("#xfields").val(clampInt(counts.x, 0, MAX_UNITS, 4));
		$("#yfields").val(clampInt(counts.y, 0, MAX_UNITS, 4));
		$("#zfields").val(clampInt(counts.z, 0, MAX_UNITS, 4));

		labelStore.x = (state.labels && state.labels.x) ? state.labels.x.slice() : [];
		labelStore.y = (state.labels && state.labels.y) ? state.labels.y.slice() : [];
		labelStore.z = (state.labels && state.labels.z) ? state.labels.z.slice() : [];
		addLabelInputGroup(".xlabel", "x", getAxisCount("xfields"));
		addLabelInputGroup(".ylabel", "y", getAxisCount("yfields"));
		addLabelInputGroup(".zlabel", "z", getAxisCount("zfields"));

		$(".grid").prop("checked", !!state.grid);

		if (state.view) {
			viewState.scale = clampFloat(state.view.scale, viewState.minScale, viewState.maxScale, 1);
			viewState.offsetX = clampFloat(state.view.offsetX, -2000, 2000, 0);
			viewState.offsetY = clampFloat(state.view.offsetY, -2000, 2000, 0);
		}

		clearBoxes();
		BOX_ID_SEQ = 1;
		var boxList = Array.isArray(state.boxes) && state.boxes.length ? state.boxes : [{ ox: 0, oy: 0, oz: 0, sx: 1, sy: 1, sz: 1, color: BOX_PALETTE[0] }];
		for (var i = 0; i < boxList.length; i++) {
			addBoxRow(boxList[i]);
		}

		drawGraph();
	}

	function downloadJson(filename, text) {
		var blob = new Blob([text], { type: "application/json;charset=utf-8" });
		var url = URL.createObjectURL(blob);
		var a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function resetView() {
		viewState.scale = 1;
		viewState.offsetX = 0;
		viewState.offsetY = 0;
		drawGraph();
	}

	function setupPanZoom() {
		var canvas = document.getElementById("c");

		$(canvas).on("mousedown", function(event) {
			viewState.isPanning = true;
			viewState.panStartX = event.clientX;
			viewState.panStartY = event.clientY;
			$(canvas).css("cursor", "grabbing");
		});

		$(window).on("mousemove", function(event) {
			if (!viewState.isPanning) {
				return;
			}
			var dx = event.clientX - viewState.panStartX;
			var dy = event.clientY - viewState.panStartY;
			viewState.offsetX += dx;
			viewState.offsetY += dy;
			viewState.panStartX = event.clientX;
			viewState.panStartY = event.clientY;
			drawGraph();
		});

		$(window).on("mouseup", function() {
			if (!viewState.isPanning) {
				return;
			}
			viewState.isPanning = false;
			$(canvas).css("cursor", "grab");
		});

		canvas.addEventListener("wheel", function(event) {
			event.preventDefault();
			var pointer = getCanvasPoint(event);
			var oldScale = viewState.scale;
			var delta = event.deltaY < 0 ? 1.1 : 0.9;
			var newScale = clampFloat(oldScale * delta, viewState.minScale, viewState.maxScale, oldScale);
			if (newScale === oldScale) {
				return;
			}

			var baseX = (pointer.x - viewState.offsetX) / oldScale;
			var baseY = (pointer.y - viewState.offsetY) / oldScale;
			viewState.scale = newScale;
			viewState.offsetX = pointer.x - (baseX * newScale);
			viewState.offsetY = pointer.y - (baseY * newScale);
			drawGraph();
		}, { passive: false });

		$(canvas).css("cursor", "grab");
	}

	$("button.makeimage").click(function() {
		$("p.status").text("Nella nuova finestra puoi salvare l'immagine.");
		var can = document.getElementById("c");
		var win = window.open();
		win.document.write("<img src='" + can.toDataURL() + "'/>");
	});

	$("button.labelz").click(function() {
		getFields();
		drawGraph();
	});

	$("button.button").click(function() {
		drawGraph();
	});

	$("button.resetview").click(function() {
		resetView();
	});

	$("button.addbox").click(function() {
		addBoxRow();
		drawGraph();
	});

	$("#boxes-container").on("click", ".remove-box", function() {
		if ($("#boxes-container .box-row").length === 1) {
			$("p.status").text("Deve rimanere almeno un box.");
			return;
		}
		$(this).closest(".box-row").remove();
		renumberBoxes();
		drawGraph();
	});

	$(document).on("change", ".box-grid input, .fields, .grid", function() {
		drawGraph();
	});

	$(document).on("input", ".xlabel textarea, .ylabel textarea, .zlabel textarea", function() {
		captureLabelStoreFromDom();
		drawGraph();
	});

	$("button.savejson").click(function() {
		try {
			var state = serializeState();
			downloadJson("abell-model.json", JSON.stringify(state, null, 2));
			$("p.status").text("JSON salvato correttamente.");
		} catch (error) {
			$("p.status").text("Errore durante il salvataggio JSON.");
		}
	});

	$("button.loadjson").click(function() {
		$("#loadjsoninput").trigger("click");
	});

	$("#loadjsoninput").on("change", function(event) {
		var file = event.target.files && event.target.files[0];
		if (!file) {
			return;
		}
		var reader = new FileReader();
		reader.onload = function(loadEvent) {
			try {
				var data = JSON.parse(loadEvent.target.result);
				loadState(data);
				$("p.status").text("JSON caricato correttamente.");
			} catch (error) {
				$("p.status").text("Impossibile caricare il file JSON.");
			}
		};
		reader.readAsText(file);
		$(this).val("");
	});

	$(document).ready(function() {
		getFields();
		renumberBoxes();
		setupPanZoom();
		drawGraph();
	});
})();
