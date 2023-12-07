// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "jupyterscript" is now active!');

	let converter = vscode.commands.registerCommand('jupyterscript.converter', function () {
		// Open a file picker dialog
		vscode.window.showOpenDialog({
			canSelectMany: false,
			openLabel: 'Select File',
			filters: {
			  'All Files': ['*']
			}
		  }).then((uri) => {
			if (uri && uri.length > 0) {
			  const selectedFileUri = uri[0];
			  const filePath = selectedFileUri.fsPath;
	  
			  // Read the content of the selected file
			  fs.readFile(filePath, 'utf-8',async function(err, data) {
				if (err) {
				  vscode.window.showErrorMessage(`Error reading file: ${err.message}`);
				  return;
				}

				const exportTagsString = await vscode.window.showInputBox({
					prompt: 'Enter Tags to export (tag1, tag2...)',
					placeHolder: 'Type here...',
				  });			  
	  
				const exportTags = exportTagsString.replace(" ", "").split(",")

				// parsing the data
				const jsonData = JSON.parse(data);
				// getting only cells with given tag
				let fileContents = ""
				for(let cell of jsonData["cells"]){
					if(cell?.metadata?.tags?.some(e => exportTags.includes(e))){
						fileContents += cell["source"].join("");
						fileContents += "\n\n";
					}
				}
				
				// get file name
				const fileName = await vscode.window.showInputBox({
					prompt: 'Enter file name to save',
					placeHolder: 'Type here...',
				  });	
				
				const currentWorkspace = vscode.workspace.workspaceFolders?.[0];

				if (!currentWorkspace) {
				vscode.window.showErrorMessage('No workspace folder found.');
				return;
				}

				// save file in current directory
				const filePath = path.join(currentWorkspace.uri.fsPath, fileName);

				// Write to the file
				fs.writeFile(filePath, fileContents, 'utf-8', (err) => {
					if (err) {
					  vscode.window.showErrorMessage(`Error writing to file: ${err.message}`);
					  return;
					}
			  
					vscode.window.showInformationMessage(`File '${fileName}' written successfully to ${currentWorkspace.uri.fsPath}`);
				  });
			  });
			}
		  });
	});

	context.subscriptions.push(converter);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
