const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let currentPanel = null;

function activate(context) {
  const disposable = vscode.commands.registerCommand('p5-phena.run', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const jsCode = editor.document.getText();
    const validation = validateUserCode(jsCode);
    if (!validation.ok) {
      vscode.window.showErrorMessage(
        `p5-phena: Syntax error in sketch – ${validation.error.message || validation.error}`
      );
      return;
    }
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
  const templatePath = path.join(context.extensionPath, 'media', 'index.html');
  let template = fs.readFileSync(templatePath, 'utf8');
  const nonce = generateNonce();
  const csp = [
    "default-src 'none'",
    `img-src ${panel.webview.cspSource} https: data:`,
    `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
    `style-src 'nonce-${nonce}'`,
    `connect-src https:`,
    `font-src ${panel.webview.cspSource} https: data:`
  ].join('; ');
  const sanitizedCode = sanitizeForScript(jsCode);

  template = template
    .replace(/{{csp}}/g, csp)
    .replace(/{{nonce}}/g, nonce)
    .replace(/{{userCode}}/g, sanitizedCode);

  return template;
}

function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

function sanitizeForScript(code) {
  return code.replace(/<\/script>/gi, '<\\/script>');
}

function validateUserCode(code) {
  try {
    // Use Function constructor to check the snippet as a function body, matching how we inject it.
    // eslint-disable-next-line no-new-func
    new Function(code);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
