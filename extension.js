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
  #consoleLog {
    box-sizing: border-box;
    margin: 0.75rem;
    padding: 0.5rem;
    height: 180px;
    overflow-y: auto;
    background-color: #111;
    color: #0f0;
    font-family: monospace;
    font-size: 0.85rem;
    border: 1px solid #333;
    border-radius: 4px;
    white-space: pre-wrap;
  }
</style>
<body>
  <div id="defaultCanvas" bgColor="#ffffff"></div>
  <div id="controls">
	<div>
		<label for="rotationSpeed">Rotation Speed (deg/sec)</label>
		<input type="range" id="rotationSpeed" min="0" max="1024" step="1" value="180" />
		<span id="rotationSpeedValue">180</span>
	</div>
	<div>
		<label for="refreshRate">Refresh Rate (fps)</label>
		<input type="number" id="refreshRate" min="1" max="240" step="1" value="30" />
		<span id="refreshRateValue">30</span>
	</div>
    <button style="width: 159px;" id="downloadImage" type="button">Download Image</button>
  </div>
  <div>Console Log:</div>
  <pre id="consoleLog"></pre>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js"></script>
  <script>
	let canvas = null;
	let rotationSpeed = 180;
	let refreshRate = 30;
	let rotationAngle = 0;
	let logBuffer = [];
	const maxLogLines = 300;
	const storageKey = 'p5PhenaSettings';

	const loadSettings = () => {
		try {
			if (!window || !window.localStorage) return null;
			const raw = window.localStorage.getItem(storageKey);
			return raw ? JSON.parse(raw) : null;
		} catch (error) {
			return {};
		}
	};
	const saveSettings = () => {
		if (!window || !window.localStorage) return;
		window.localStorage.setItem(
			storageKey,
			JSON.stringify({ rotationSpeed, refreshRate })
		);
	};

	const storedSettings = loadSettings();
	if (storedSettings) {
		if (typeof storedSettings.rotationSpeed === 'number') {
			rotationSpeed = storedSettings.rotationSpeed;
		}
		if (typeof storedSettings.refreshRate === 'number') {
			refreshRate = storedSettings.refreshRate;
		}
	}

	window.addEventListener('DOMContentLoaded', () => {
		const rotationSlider = document.getElementById('rotationSpeed');
		const rotationValue = document.getElementById('rotationSpeedValue');
		const refreshInput = document.getElementById('refreshRate');
		const refreshValue = document.getElementById('refreshRateValue');
		const downloadButton = document.getElementById('downloadImage');
		const consoleLog = document.getElementById('consoleLog');
		let appendLog = () => {};

		if (consoleLog) {
			appendLog = (message) => {
				logBuffer.push(message);
				if (logBuffer.length > maxLogLines) {
					logBuffer = logBuffer.slice(-maxLogLines);
				}
				consoleLog.textContent = logBuffer.join('\\n');
				consoleLog.scrollTop = consoleLog.scrollHeight;
			};

			const originalLog = console.log.bind(console);
			const originalError = console.error.bind(console);
			const originalWarn = console.warn.bind(console);

			console.log = (...args) => {
				originalLog(...args);
				appendLog(args.map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' '));
			};
			console.error = (...args) => {
				originalError(...args);
				appendLog('[Error] ' + args.map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' '));
			};
			console.warn = (...args) => {
				originalWarn(...args);
				appendLog('[Warn] ' + args.map((value) => typeof value === 'string' ? value : JSON.stringify(value)).join(' '));
			};

			window.addEventListener('unload', () => {
				console.log = originalLog;
				console.error = originalError;
				console.warn = originalWarn;
			});
		}

		if (rotationSlider && rotationValue) {
			const applyRotationSpeed = (value) => {
				const parsed = parseFloat(value);
				if (!Number.isNaN(parsed)) {
					rotationSpeed = parsed;
					rotationValue.textContent = rotationSpeed.toFixed(0);
					saveSettings();
				}
			};
			rotationSlider.value = String(rotationSpeed);
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
					saveSettings();
				}
			};
			refreshInput.value = String(refreshRate);
			refreshText(refreshRate);
			applyRefreshRate();
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
		canvas.style('width', '500px');
		canvas.style('height', '500px');
		canvas.style('border-radius', '50%');  
		translate(width / 2, height / 2);
		${jsCode}
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
