const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let tool = 'line'; // For shape tools (line, rectangle, circle, square)
let cursorTool = 'pen'; // For drawing tools (pen, pencil, marker, eraser)
let startX, startY;
let currentColor = '#000000';
let currentLineWidth = 2;
let importedImage = null;
let imgX = 0, imgY = 0, imgWidth, imgHeight;
let zoomLevel = 1; // Default zoom level
const zoomStep = 0.1; // Step to zoom in/out
let lastX = 0, lastY = 0; // For freehand drawing
let strokes = []; // To store all freehand strokes and shapes
let undoStack = []; // Stack for undo functionality
let currentShape = null; // To store shape information
let backgroundColor = '#FFFFFF'; // Assuming white canvas background color

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Set the selected shape tool (line, rectangle, etc.)
function setTool(selectedTool) {
    tool = selectedTool;
    cursorTool = 'shape'; // Set cursor tool for shapes
}

// Set the selected cursor tool (pen, pencil, marker, eraser, pointer)
function setCursorTool(selectedTool) {
    cursorTool = selectedTool;
    if (cursorTool === 'pointer') {
        canvas.style.cursor = 'default'; // Change to default pointer
    } else {
        canvas.style.cursor = 'crosshair'; // Crosshair for drawing tools
    }
}

// Set the selected color
function setColor(color) {
    currentColor = color;
}

// Set the selected line width
function setLineWidth(width) {
    currentLineWidth = width;
}

// Start drawing on mouse down
function startDrawing(e) {
    if (cursorTool === 'pointer') return; // Do nothing if it's pointer mode
    drawing = true;

    startX = e.offsetX / zoomLevel;
    startY = e.offsetY / zoomLevel;

    lastX = startX;
    lastY = startY;

    if (cursorTool === 'pen' || cursorTool === 'pencil' || cursorTool === 'marker' || cursorTool === 'eraser') {
        currentStroke = {
            tool: cursorTool,
            color: currentColor,
            lineWidth: currentLineWidth,
            points: [{ x: startX, y: startY }],
        };
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    } else if (cursorTool === 'shape') {
        // Store initial shape data
        currentShape = {
            tool: tool, // line, rectangle, circle, square
            startX: startX,
            startY: startY,
            color: currentColor,
            lineWidth: currentLineWidth,
        };
    }
}

// Draw shapes or freehand lines dynamically while moving the mouse
function draw(e) {
    if (!drawing) return;

    const endX = e.offsetX / zoomLevel;
    const endY = e.offsetY / zoomLevel;

    if (cursorTool === 'pen' || cursorTool === 'pencil' || cursorTool === 'marker') {
        // Track points in current stroke
        currentStroke.points.push({ x: endX, y: endY });
        setDrawingStyles(cursorTool);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        lastX = endX;
        lastY = endY;
    } else if (cursorTool === 'eraser') {
        erase(endX, endY);
    } else if (cursorTool === 'shape') {
        // Clear and redraw the canvas to keep previous shapes intact
        redrawCanvas();

        // Set the drawing styles for shapes
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;

        // Draw the current shape dynamically based on tool selection
        if (tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        } else if (tool === 'rectangle') {
            ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        } else if (tool === 'circle') {
            const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (tool === 'square') {
            const side = Math.min(Math.abs(endX - startX), Math.abs(endY - startY));
            ctx.strokeRect(startX, startY, side, side);
        }
    }
}

// Stop drawing on mouse up or out
function stopDrawing() {
    if (!drawing) return;

    if (cursorTool === 'shape') {
        const endX = lastX;
        const endY = lastY;

        // Store the final shape in the strokes array
        strokes.push({
            tool: tool,
            startX: currentShape.startX,
            startY: currentShape.startY,
            endX: endX,
            endY: endY,
            color: currentColor,
            lineWidth: currentLineWidth,
        });

        // Push the shape to the undo stack
        undoStack.push([...strokes]);
    } else if (drawing && currentStroke && cursorTool !== 'eraser') {
        strokes.push(currentStroke); // Save the current stroke
        undoStack.push([...strokes]); // Push the current state to undo stack
    }

    drawing = false;
}

// Erase function to remove points in freehand strokes
function erase(endX, endY) {
    strokes.forEach(stroke => {
        if (stroke.tool !== 'pen' && stroke.tool !== 'pencil' && stroke.tool !== 'marker') return;

        stroke.points = stroke.points.filter(point => {
            const distance = Math.sqrt((point.x - endX) ** 2 + (point.y - endY) ** 2);
            return distance > currentLineWidth; // Erase points within current line width radius
        });
    });

    redrawCanvas();
}

// Set styles based on cursor tool
function setDrawingStyles(tool) {
    if (tool === 'eraser') {
        ctx.strokeStyle = backgroundColor; // Use background color to erase
        ctx.lineWidth = currentLineWidth * 2; // Slightly larger for erasing
        return;
    }
    ctx.strokeStyle = currentColor;
    if (tool === 'pen') {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = currentLineWidth;
    } else if (tool === 'pencil') {
        ctx.globalAlpha = 0.6; // Lighter stroke for pencil
        ctx.lineWidth = currentLineWidth / 2; // Thinner line
    } else if (tool === 'marker') {
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = currentLineWidth * 3; // Thicker line
    }
}

// Redraw the canvas content after erasing or zooming
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);

    if (importedImage) {
        ctx.drawImage(importedImage, imgX, imgY, imgWidth, imgHeight);
    }

    // Redraw all the saved strokes
    strokes.forEach(stroke => {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;

        if (stroke.tool === 'pen' || stroke.tool === 'pencil' || stroke.tool === 'marker') {
            ctx.beginPath();
            stroke.points.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        } else if (stroke.tool === 'line') {
            ctx.beginPath();
            ctx.moveTo(stroke.startX, stroke.startY);
            ctx.lineTo(stroke.endX, stroke.endY);
            ctx.stroke();
        } else if (stroke.tool === 'rectangle') {
            ctx.strokeRect(stroke.startX, stroke.startY, stroke.endX - stroke.startX, stroke.endY - stroke.startY);
        } else if (stroke.tool === 'circle') {
            const radius = Math.sqrt(Math.pow(stroke.endX - stroke.startX, 2) + Math.pow(stroke.endY - stroke.startY, 2));
            ctx.beginPath();
            ctx.arc(stroke.startX, stroke.startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        } else if (stroke.tool === 'square') {
            const side = Math.min(Math.abs(stroke.endX - stroke.startX), Math.abs(stroke.endY - stroke.startY));
            ctx.strokeRect(stroke.startX, stroke.startY, side, side);
        }
    });

    ctx.restore();
}

// Undo functionality
function undo() {
    if (undoStack.length > 0) {
        undoStack.pop(); // Remove the latest action
        strokes = undoStack.length > 0 ? [...undoStack[undoStack.length - 1]] : []; // Restore the previous state
        redrawCanvas(); // Redraw the canvas after undo
    }
}

// Import image function
document.getElementById('imageLoader').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;

        img.onload = function() {
            importedImage = img;
            imgWidth = img.width;
            imgHeight = img.height;

            // Ensure the image fits the canvas
            if (img.width > canvas.width || img.height > canvas.height) {
                const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                imgWidth = img.width * scale;
                imgHeight = img.height * scale;
            }

            redrawCanvas();
        };
    };

    reader.readAsDataURL(file);
});

// Export the canvas image as a PNG file
function exportImage() {
    ctx.font = "20px Arial";
    ctx.fillStyle = currentColor;
    ctx.fillText("© Your Mark", canvas.width - 150, canvas.height - 20);

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'drawing.png';
    link.click();
}

// Zoom in function
function zoomIn() {
    zoomLevel += zoomStep;
    redrawCanvas();
}

// Zoom out function
function zoomOut() {
    if (zoomLevel > zoomStep) {
        zoomLevel -= zoomStep;
        redrawCanvas();
    }
}
