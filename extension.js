const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let currentPanel = null;

function activate(context) {
  const disposable = vscode.commands.registerCommand('p5-phena.run', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const jsCode = editor.document.getText();
    if (currentPanel) {
      currentPanel.webview.html = getHtml(jsCode, context, currentPanel);
      currentPanel.reveal(undefined, true);
      return;
    }

    currentPanel = vscode.window.createWebviewPanel(
      'p5view',
      'p5.js Preview',
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
      { enableScripts: true }
    );

    currentPanel.onDidDispose(() => {
      currentPanel = null;
    });

    currentPanel.webview.html = getHtml(jsCode, context, currentPanel);
  });

  context.subscriptions.push(disposable);
}

function getHtml(jsCode, context, panel) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<style>
  body {
	margin: 0;
	padding: 0;
  }
  #controls {
    display: flex;
	flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    font-family: sans-serif;
  }
  #controls label {
    font-size: 0.9rem;
  }
  #controls button {
    padding: 0.35rem 0.75rem;
    border: 1px solid #999;
    border-radius: 4px;
    background-color: #f5f5f5;
    cursor: pointer;
  }
  canvas {
	display: block;
	width: 40%;
	height: 40%;
  }
</style>
<body>
  <div id="defaultCanvas" bgColor="#ffffff"></div>
  <div id="controls">
	<div>
		<label for="rotationSpeed">Rotation Speed (deg/sec)</label>
		<input type="range" id="rotationSpeed" min="0" max="1024" step="1" value="180" />
	</div>
	<div>
		<span id="rotationSpeedValue">180</span>
		<label for="refreshRate">Refresh Rate (fps)</label>
	</div>
	<div>
		<input type="number" id="refreshRate" min="1" max="240" step="1" value="30" />
		<span id="refreshRateValue">30</span>
	</div>
    <button id="downloadImage" type="button">Download Image</button>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js"></script>
  <script>
	${jsCode}
	let canvas = null;
	let rotationSpeed = 180;
	let refreshRate = 30;
	let rotationAngle = 0;

	window.addEventListener('DOMContentLoaded', () => {
		const rotationSlider = document.getElementById('rotationSpeed');
		const rotationValue = document.getElementById('rotationSpeedValue');
		const refreshInput = document.getElementById('refreshRate');
		const refreshValue = document.getElementById('refreshRateValue');
		const downloadButton = document.getElementById('downloadImage');

		if (rotationSlider && rotationValue) {
			const applyRotationSpeed = (value) => {
				const parsed = parseFloat(value);
				if (!Number.isNaN(parsed)) {
					rotationSpeed = parsed;
					rotationValue.textContent = rotationSpeed.toFixed(0);
				}
			};
			applyRotationSpeed(rotationSlider.value);
			window.addEventListener('input', (event) => {
				if (event.target === rotationSlider) {
					applyRotationSpeed(event.target.value);
				}
			});
		}

		if (refreshInput) {
			const refreshText = (value) => {
				if (refreshValue) {
					refreshValue.textContent = String(value);
				}
			};
			const applyRefreshRate = () => {
				const parsed = parseFloat(refreshInput.value);
				if (!Number.isNaN(parsed) && parsed > 0) {
					refreshRate = parsed;
					refreshText(refreshRate);
					if (typeof frameRate === 'function') {
						frameRate(refreshRate);
					}
				}
			};
			refreshInput.value = String(refreshRate);
			refreshText(refreshRate);
			window.addEventListener('change', (event) => {
				if (event.target === refreshInput) {
					applyRefreshRate();
				}
			});
			window.addEventListener('keyup', (event) => {
				if (event.target === refreshInput && event.key === 'Enter') {
					applyRefreshRate();
				}
			});
		}

		if (downloadButton) {
			window.addEventListener('click', (event) => {
				if (event.target === downloadButton && canvas) {
					const link = document.createElement('a');
					link.href = canvas.elt.toDataURL('image/png');
					link.download = 'p5-canvas.png';
					link.click();
				}
			});
		}
	});

    function setup() {
        canvas = createCanvas(1024, 1024);
		canvas.parent('defaultCanvas');
		canvas.style('width', '500px');          // ← 見た目は小さく
		canvas.style('height', '500px');
		canvas.style('border-radius', '50%');  
		run(canvas);
		frameRate(refreshRate);
    }
	
	function draw() {
	    rotationAngle = (rotationAngle + rotationSpeed * (deltaTime / 1000)) % 360;
		canvas.style('transform', 'rotate(' + rotationAngle + 'deg)');
	}
  </script>
</body>
</html>`;
}

function deactivate() {}

module.exports = { activate, deactivate };
