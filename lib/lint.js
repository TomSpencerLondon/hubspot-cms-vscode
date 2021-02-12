const { validateHubl } = require('@hubspot/cli-lib/api/validate');
const { getPortalId } = require('@hubspot/cli-lib');
const vscode = require('vscode');

const getRange = (document, error) => {
  if (error.startPosition > 0) {
    return document.getWordRangeAtPosition(
      new vscode.Position(error.lineno - 1, error.startPosition - 1)
    );
  } else {
    return document.lineAt(new vscode.Position(error.lineno - 1, 0)).range;
  }
};

async function updateDiagnostics(document, collection) {
  const { renderingErrors } = await validateHubl(
    getPortalId(),
    document.getText()
  );

  const fitleredErrors = renderingErrors.filter((error) => {
    return error.reason != 'MISSING';
  });

  const templateErrors = fitleredErrors.map((error) => {
    return {
      code: '',
      message: error.message,
      range: getRange(document, error),
      severity: vscode.DiagnosticSeverity.Error,
    };
  });

  if (document) {
    collection.set(document.uri, templateErrors);
  } else {
    collection.clear();
  }
}

const collection = vscode.languages.createDiagnosticCollection('hubl');
let documentChangeListener;

const enableLinting = () => {
  let timeout = null;

  if (vscode.window.activeTextEditor) {
    updateDiagnostics(vscode.window.activeTextEditor.document, collection);
  }

  documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    (editor) => {
      if (editor) {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          updateDiagnostics(editor.document, collection);
        }, 1000);
      }
    }
  );
};

const disableLinting = () => {
  // Clear out any existing diagnostics
  collection.clear();
  // Remove onDidChangeTextDocument event listener
  documentChangeListener.dispose();
};

module.exports = { enableLinting, disableLinting };