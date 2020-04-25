// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "matheditor" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.mathEditor', function () {
		// The code you place here will be executed every time your command is executed
		const panel = vscode.window.createWebviewPanel('mathEditor', 'Math Editor',
		vscode.ViewColumn.One, { enableScripts: true }
		);

		panel.webview.html = getWebviewContent();
		const onDiskPath = vscode.Uri.file(
			path.join(context.extensionPath, 'icon')
		);

		const xaSrc = panel.webview.asWebviewUri(onDiskPath);
		//panel.webview.html = onDiskPath;

		const onDiskPathS = vscode.Uri.file(
			path.join(context.extensionPath, 'main', 'bundle.js')
		);

		const scriptUri = panel.webview.asWebviewUri(onDiskPathS);

		const onDiskPathj = vscode.Uri.file(
			path.join(context.extensionPath, 'main', 'jquery-3.4.1.min.js')
		);

		const jquerymin = panel.webview.asWebviewUri(onDiskPathj);

		const onDiskPathk = vscode.Uri.file(
			path.join(context.extensionPath, 'main', 'keyboard.js')
		);

		const keboard = panel.webview.asWebviewUri(onDiskPathk);

		const onDiskPathstyle = vscode.Uri.file(
			path.join(context.extensionPath, 'main', 'keyboard.css')
		);

		const keboardcss = panel.webview.asWebviewUri(onDiskPathstyle);

		const onDiskPathm = vscode.Uri.file(
			path.join(context.extensionPath, 'node_modules', 'mathjax-node', 'node_modules', 'mathjax', 'MathJax.js')
		);

		const mathjaxs = panel.webview.asWebviewUri(onDiskPathm);
		

		panel.webview.html = getWebviewContent(xaSrc, scriptUri, jquerymin, keboard, keboardcss, mathjaxs);
	});

	context.subscriptions.push(disposable);
}


function getWebviewContent(xaSrc, scriptUri, jquerymin, keboard, keboardcss, mathjaxs){
	return `<!DOCTYPE html>
	<head>
		<title>Virtual Keyboard w/ HTML, CSS & JS</title>
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta charset="utf-8">
		<link rel="stylesheet" type="text/css" href="${keboardcss}">

		<script type="text/x-mathjax-config">
		MathJax.Hub.Config({
		  showProcessingMessages: false,
		  tex2jax: {
		    inlineMath: [
		      ['$','$'],
		      [ '\\(', '\\)' ]
		    ]
		  },
		  extensions: ['toMathML.js']
		});

		var math = null;
		MathJax.Hub.queue.Push(function () {
		  math = MathJax.Hub.getAllJax('MathOutput') [0];
		});
		window.updateMathMl = function (math) {
			document.getElementById('output').value = math.root.toMathML("");
		};

		window.UpdateMath = function (TeX) {
		  MathJax.Hub.queue.Push(['Text', math, '\\\\displaystyle{' + TeX + '}']);
		  document.getElementById('mathml').value = '<?xml version="1.0"?>' + math.root.toMathML("");
		};
	</script>
	<script src="${jquerymin}"></script>
	<script async src="${mathjaxs}?config=TeX-MML-AM_CHTML"></script>
	</head>
	
	<body>
	<textarea class="focus" id="MathInput" placeholder="Type your equation in the box" style="position: absolute; top: 200px; left: 20px;" cols="50" rows="10" onkeyup="UpdateMath(this.value)"></textarea>


	<div id="MathOutput">
	<h2 style="position: absolute; top: 30px; left: 150px;">$$ { } $$</h2>
	</div>

	<div>
		<button type="button" style="font-size: 16px; position: absolute; top: 60px; right: 490px;">MathML</button>

		<button type="button" onclick="mathmlCopy()" style="font-size: 16px; position: absolute; top: 100px; right: 490px;">Copy</button>

		<textarea class="mathml" id="mathml" placeholder="MathML code" style="position: absolute; top: 40px; right:30px;" cols="50" rows="10" ></textarea>
	</div>

	<div>
	<button type="button" onclick="output2()" style="font-size: 16px; position: absolute; top: 220px; right: 490px;">Latex</button>

	<button type="button" onclick="latexCopy()" style="font-size: 16px; position: absolute; top: 250px; right: 490px;">Copy</button>

	<textarea class="latex" id="latex" placeholder="latex code" style="position: absolute; top: 220px; right: 30px;" cols="50" rows="5"></textarea>
	</div>

	<div>
	<button type="button" onclick="output3()" style="font-size: 16px; position: absolute; top: 320px; right: 490px;">AsciiMath</button>

	<button type="button" onclick="asciimathCopy()" style="font-size: 16px; position: absolute; top: 350px; right: 490px;">Copy</button>

	<textarea class="asciimath" id="asciimath" placeholder="asciimath code" style="position: absolute; top: 320px; right: 30px;" cols="50" rows="5"></textarea>
	</div>


	<ul class="keyboard">
				<li class="sup"><img src='${xaSrc}/x^a.png'></li>
				<li class="sub"><img src='${xaSrc}/x_a.png'></li>
				<li class="frac"><img src='${xaSrc}/frac{a}{b}.png'></li>
				<li class="sqrt"><img src='${xaSrc}/sqrt{a}.png'></li>
				<li class="un_sqrt"><img src='${xaSrc}/sqrt[b]{a}.png'></li>
				<li class="int_ab"><img src='${xaSrc}/int_a^b.png'></li>
				<li class="bigcap"><img src='${xaSrc}/bigcap_a^b.png'></li>
				<li class="bigcup"><img src='${xaSrc}/bigcup_a^b.png'></li>
				<li class="sum"><img src='${xaSrc}/sum_a^b.png'></li>
				<li class="prod"><img src='${xaSrc}/prod_a^b.png'></li>
				<li class="coprod"><img src='${xaSrc}/coprod_a^b.png'></li>
				<li class="lim"><img src='${xaSrc}/lim_{x to a}.png'></li>
				<li class="lxr"><img src='${xaSrc}/left(xright).png'></li>
				<li class="backspace last" style="width: 8%; background: #eb3434;"><img src='${xaSrc}/backspace.png'></li>
				<li class="lxr1"><img src='${xaSrc}/left[xright].png'></li>
				<li class="lxr2"><img src='${xaSrc}/left{xright}.png'></li>
				<li class="lxr3"><img src='${xaSrc}/leftxright.png'></li>
				<li class="floor"><img src='${xaSrc}/lfloor xrfloor.png'></li>
				<li class="ceil"><img src='${xaSrc}/lceil xrceil.png'></li>
				<li class="xangle"><img src='${xaSrc}/langle xrangle.png'></li>
				<li class="matrix"><img src='${xaSrc}/begin{matrix}a&bc&dend{matrix}.png'></li>
				<li class="matrix_ab"><img src='${xaSrc}/begin{bmatrix}.png'></li>
				<li class="matrix_AB"><img src='${xaSrc}/begin{Bmatrix}end.png'></li>
				<li class="pmatrix"><img src='${xaSrc}/begin{pmatrix}.png'></li>
				<li class="binom"><img src='${xaSrc}/binom{n}{r}.png'></li>
				<li class="l_matrix_r"><img src='${xaSrc}/left{begin{matrix}abend{matrix}right.png'></li>
				<li class="lmatrix_r"><img src='${xaSrc}/left[begin{matrix}abend{matrix}right.png'></li>
				<li class="larrow_ba"><img src='${xaSrc}/xleftarrow[b]{a}.png'></li>
				<li class="rarrow_ba"><img src='${xaSrc}/xrightarrow[b]{a}.png'></li>
				<li class="larrow_a"><img src='${xaSrc}/overleftarrow{a}.png'></li>
				<li class="rarrow_a"><img src='${xaSrc}/overrightarrow{a}.png'></li>
				<li class="overline"><img src='${xaSrc}/overline{a}.png'></li>
				<li class="red_a"><img src='${xaSrc}/{color{Red}a}.png'></li>
				<li class="mathbbR"><img src='${xaSrc}/mathbb{R}.png'></li>
				<li class="pm"><img src='${xaSrc}/pm.png'></li>
				<li class="mp"><img src='${xaSrc}/mp.png'></li>
				<li class="times"><img src='${xaSrc}/times.png'></li>
				<li class="div"><img src='${xaSrc}/div.png'></li>
				<li class="setminus"><img src='${xaSrc}/setminus.png'></li>
				<li class="leqslant"><img src='${xaSrc}/leqslant.png'></li>
				<li class="geqslant"><img src='${xaSrc}/geqslant.png'></li>
				<li class="ll"><img src='${xaSrc}/ll.png'></li>
				<li class="gg"><img src='${xaSrc}/gg.png'></li>
				<li class="in"><img src='${xaSrc}/in.png'></li>
				<li class="ni"><img src='${xaSrc}/ni.png'></li>
				<li class="notin"><img src='${xaSrc}/notin.png'></li>
				<li class="forall"><img src='${xaSrc}/forall.png'></li>
				<li class="exists"><img src='${xaSrc}/exists.png'></li>
				<li class="varnothing"><img src='${xaSrc}/varnothing.png'></li>
				<li class="pi"><img src='${xaSrc}/pi.png'></li>
				<li class="alpha"><img src='${xaSrc}/alpha.png'></li>
				<li class="beta"><img src='${xaSrc}/beta.png'></li>
				<li class="Gamma"><img src='${xaSrc}/Gamma.png'></li>
				<li class="Delta"><img src='${xaSrc}/Delta.png'></li>
				<li class="therefore"><img src='${xaSrc}/therefore.png'></li>
				<li class="because"><img src='${xaSrc}/because.png'></li>
				<li class="cdots"><img src='${xaSrc}/cdots.png'></li>
				<li class="ddots"><img src='${xaSrc}/ddots.png'></li>
				<li class="vdots"><img src='${xaSrc}/vdots.png'></li>
				<li class="leftarrow"><img src='${xaSrc}/leftarrow.png'></li>
				<li class="rightarrow"><img src='${xaSrc}/rightarrow.png'></li>
				<li class="Leftarrow"><img src='${xaSrc}/Leftarrows.png'></li>
				<li class="Rightarrow"><img src='${xaSrc}/Rightarrows.png'></li>
				<li class="mapsto"><img src='${xaSrc}/mapsto.png'></li>
				<li class="lr_arrow"><img src='${xaSrc}/Leftrightarrow.png'></li>
				<li class="lrharppons"><img src='${xaSrc}/leftrightharpoons.png'></li>
				<li class="rlharpoons"><img src='${xaSrc}/rightleftharpoons.png'></li>

				<li class="return last" style="width: 8%; background: #34eb40;"><img src='${xaSrc}/keyboard_return.png'></li>
				
			</ul>


		<script src="${keboard}">
			</script>
		<script src="${scriptUri}">
			</script>
	</body>
	</html>`;
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
