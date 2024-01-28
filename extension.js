// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

// stores all files being watched
var watch_list = []

async function getTagsInput(){
	const exportTagsString = await vscode.window.showInputBox({
		prompt: 'Enter Tags to export (tag1, tag2...)',
		placeHolder: 'Type here...',
	  });			  

	return exportTagsString.replace(" ", "").split(",")
}


function dataToFileString(data, exportTags){
	// parsing the data
	const jsonData = JSON.parse(data);
	// getting only cells with given tag
	let fileContents = ""
	for(let cell of jsonData["cells"]){
		if(cell?.metadata?.tags?.some(e => exportTags.includes(e))){
			fileContents += "# %%\n"
			fileContents += cell["source"].join("");
			fileContents += "\n\n";
		}
	}
	 return fileContents
}

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

				const exportTags = await getTagsInput()

				// getting only cells with given tag
				let fileContents = dataToFileString(data, exportTags);
				
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

	let watcher = vscode.commands.registerCommand('jupyterscript.watcher', function () {
		// Open a file picker dialog
		vscode.window.showOpenDialog({
			canSelectMany: false,
			openLabel: 'Select File',
			filters: {
			  'All Files': ['*']
			}
		  }).then(async function(uri) {
			if (uri && uri.length > 0) {
				const selectedFileUri = uri[0];
			  	const filePath = selectedFileUri.fsPath;

				// get tags to export
				const exportTags = await getTagsInput()

				// get file name
				const outFileName = await vscode.window.showInputBox({
					prompt: 'Enter file name to save',
					placeHolder: 'Type here...',
				  });	
				
				const currentWorkspace = vscode.workspace.workspaceFolders?.[0];

				if (!currentWorkspace) {
					vscode.window.showErrorMessage('No workspace folder found.');
					return;
				}
				// save file in current directory
				const outFilePath = path.join(currentWorkspace.uri.fsPath, outFileName);

				// Watch the file for changes
				const fileWatcher = fs.watch(filePath, (eventType, filename) => {
					if (eventType === 'change') {				
						fs.readFile(filePath, 'utf-8',async function(err, data) {
							if (err) {
							  vscode.window.showErrorMessage(`Error reading file: ${err.message}`);
							  return;
							}

							// getting only cells with given tag
							let fileContents = dataToFileString(data, exportTags);

							// Write to the file
							fs.writeFile(outFilePath, fileContents, 'utf-8', (err) => {
								if (err) {
								vscode.window.showErrorMessage(`Error writing to file: ${err.message}`);
								return;
								}
								vscode.window.showInformationMessage(`File '${fileName}' written successfully to ${currentWorkspace.uri.fsPath}`);
							});
						});
						
					}
				});

				// creata watch object
				var watch_file = {
					"name": outFileName,
					"filePath": filePath,
					"tags": exportTags,
					"watcher": fileWatcher,
					"outFilePath": outFilePath
				}

				console.log("pushing", watch_file)
				// add to watch list
				watch_list.push(watch_file)
				console.log("pushed", watch_list)
				
			}
		});
	});

	// stop watching files for auto-export
	let stopWatcher = vscode.commands.registerCommand('jupyterscript.stopWatcher', async function () {
		let options = []
		console.log(watch_list);
		for(let e of watch_list){
			options.push(e["name"]);
		}
		options.push("Stop All")

		// Open a option picker dialog
		const selectedOption = await vscode.window.showQuickPick(options, {
			placeHolder: 'Select an option',
		  });

		if (selectedOption == undefined)
			return

		if (selectedOption === "Stop All"){
			watch_list.forEach((fileWatcher) => {
				fileWatcher["watcher"].close();
			});
		}
		else{
			for(let watcher of watch_list){
				if(selectedOption == watcher["name"])
					watcher["watcher"].close()
			}
			watch_list = watch_list.filter((entry) => entry["name"] != selectedOption)
		}
	});
	

	context.subscriptions.push(converter);
	context.subscriptions.push(watcher);
	context.subscriptions.push(stopWatcher);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
