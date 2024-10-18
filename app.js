document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const xrayImage = document.getElementById('xray-image');
    const imageContainer = document.getElementById('image-container');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const exportBtn = document.getElementById('export-btn');
    const markerBtn = document.getElementById('marker-btn');
    const textBtn = document.getElementById('text-btn');
    const shapeSelector = document.getElementById('draw-shape');
    const undoBtn = document.getElementById('undo-btn');
    const colorPicker = document.getElementById('color-picker');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const scaleSlider = document.getElementById('scale-slider');

    let scale = 1;
    let rotation = 0;
    let addMarkerMode = false;
    let addTextMode = false;
    let drawShapeMode = null;
    let isDrawing = false;
    let startX, startY, shapeElement;
    let currentPath = null;
    const shapes = [];
    let currentColor = colorPicker.value;

    // Import the image
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                xrayImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Zoom In
    zoomInBtn.addEventListener('click', () => {
        scale += 0.1;
        updateTransform();
    });

    // Zoom Out
    zoomOutBtn.addEventListener('click', () => {
        if (scale > 0.2) {
            scale -= 0.1;
            updateTransform();
        }
    });

    // Rotate Left
    rotateLeftBtn.addEventListener('click', () => {
        rotation -= 90;
        updateTransform();
    });

    // Rotate Right
    rotateRightBtn.addEventListener('click', () => {
        rotation += 90;
        updateTransform();
    });

    // Handle Scale Slider
    scaleSlider.addEventListener('input', (event) => {
        scale = event.target.value;
        updateTransform();
    });

    // Function to update the image transform (rotation and scale)
    function updateTransform() {
        xrayImage.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
    }

    // Select Marker Mode
    markerBtn.addEventListener('click', () => {
        addMarkerMode = true;
        addTextMode = false;
        drawShapeMode = null;
    });

    // Select Text Mode
    textBtn.addEventListener('click', () => {
        addTextMode = true;
        addMarkerMode = false;
        drawShapeMode = null;
    });

    // Shape selection
    shapeSelector.addEventListener('change', (event) => {
        drawShapeMode = event.target.value;
        addMarkerMode = false;
        addTextMode = false;
    });

    // Handle Color Change
    colorPicker.addEventListener('input', (event) => {
        currentColor = event.target.value;
    });

    // Drawing Freehand with Marker (Lines and Curves)
    imageContainer.addEventListener('mousedown', (event) => {
        if (addMarkerMode) {
            const rect = imageContainer.getBoundingClientRect();
            startX = event.clientX - rect.left;
            startY = event.clientY - rect.top;
            isDrawing = true;

            // Create an SVG element to draw the path
            currentPath = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            currentPath.style.position = "absolute";
            currentPath.style.left = 0;
            currentPath.style.top = 0;
            currentPath.style.width = "100%";
            currentPath.style.height = "100%";
            imageContainer.appendChild(currentPath);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.classList.add('path');
            path.setAttribute('d', `M ${startX} ${startY}`);
            path.setAttribute('stroke', currentColor);
            path.setAttribute('stroke-width', '2'); // Set stroke width
            currentPath.appendChild(path);

            shapes.push(currentPath);
        } else if (addTextMode) {
            // Add text on click
            const rect = imageContainer.getBoundingClientRect();
            const textX = event.clientX - rect.left;
            const textY = event.clientY - rect.top;

            const textElement = document.createElement('div');
            textElement.contentEditable = true; // Make the text editable
            textElement.style.position = 'absolute';
            textElement.style.left = `${textX}px`;
            textElement.style.top = `${textY}px`;
            textElement.style.color = currentColor;
            textElement.style.background = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent background
            textElement.style.padding = '2px';
            textElement.style.border = '1px solid #ccc';
            textElement.style.pointerEvents = 'auto'; // Ensure it's clickable
            textElement.style.cursor = 'text'; // Cursor for text editing

            imageContainer.appendChild(textElement);
        }
    });

    imageContainer.addEventListener('mousemove', (event) => {
        if (isDrawing && addMarkerMode) {
            const rect = imageContainer.getBoundingClientRect();
            const currentX = event.clientX - rect.left;
            const currentY = event.clientY - rect.top;
            const path = currentPath.querySelector('path');
            const d = path.getAttribute('d');
            path.setAttribute('d', `${d} L ${currentX} ${currentY}`);  // Draw a line to the current point
        }
    });

    imageContainer.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    // Undo Last Action
    undoBtn.addEventListener('click', () => {
        if (shapes.length > 0) {
            const lastShape = shapes.pop();
            if (lastShape) {
                lastShape.remove();
            }
        }
    });

    // Export Image
    exportBtn.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions based on current scale
        canvas.width = xrayImage.naturalWidth * scale;
        canvas.height = xrayImage.naturalHeight * scale;

        // Draw the X-ray image onto the canvas
        ctx.scale(scale, scale);
        ctx.drawImage(xrayImage, 0, 0);

        // Draw shapes
        shapes.forEach((svg) => {
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svg);
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
        });

        // Draw text elements
        const textElements = imageContainer.querySelectorAll('div[contenteditable]');
        textElements.forEach((textElement) => {
            const textX = parseFloat(textElement.style.left) * scale; // Adjust for scale
            const textY = parseFloat(textElement.style.top) * scale; // Adjust for scale
            ctx.fillStyle = textElement.style.color;
            ctx.fillText(textElement.innerText, textX, textY);
        });

        // Create download link
        const link = document.createElement('a');
        link.download = 'edited-xray.png';
        canvas.toBlob((blob) => {
            link.href = URL.createObjectURL(blob);
            link.click();
        }, 'image/png');
    });
});
