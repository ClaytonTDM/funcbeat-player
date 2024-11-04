import * as acorn from "acorn";
import * as estraverse from "estraverse";
import * as astring from "astring";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { basicDark } from '@fsegurai/codemirror-theme-basic-dark'

window.acorn = acorn;
window.estraverse = estraverse;
window.astring = astring;

let startState = EditorState.create({
	doc: `let lastSample = 0; // variables here are static and can always be accessed
let resonanceMomentum = 0;
const notedata = "$$$000,,,,,,,,''"; // this is a good place to store constants like note values because creating arrays and such constantly ruins performance
// note that this is a bad example, a string like this isn't an issue
// this is also a good place to do decompression calculations, for storing things like samples efficiently

return function (time, sampleRate) { // time is in secs, note that samplerate can still change the sound when static variables are used, this is why samplerate is given
	const pitch = 2 ** ((notedata.charCodeAt(time * 4.3 & 15) + 22) / 12); // grab values from string and convert semitones to hz
	const pulse = ((time * pitch % 1 > (time / 2 % 1) * .6 + .2) - .5) / 2; // generate pulse wave
	lastSample += resonanceMomentum += (pulse - lastSample - resonanceMomentum * 3) / (cos(time / 5) * 170 + 200); // lowpass with resonance, doesn't work on other samplerates
	const kick = (sin((time * 4.3 % 2 + .01) ** .3 * 180)) / 4;
	return lastSample + kick;
}`,
	extensions: [
		basicSetup,
		keymap.of([{
			key: "Tab",
			run: ({ state, dispatch }) => {
				dispatch(state.update(state.replaceSelection("\t")));
				return true;
			}
		}]),
		javascript(),
		basicDark,
    EditorView.lineWrapping
	],
});

let editor = new EditorView({
	state: startState,
	parent: document.getElementById("code"),
});
function showError(error) {
	document.getElementById("error").textContent = `thrown: ${error}`;
	document.getElementById("error").classList.remove("hidden");
}
showError(null);
const dangerousAPIs = [
	// File and Network
	"fetch",
	"XMLHttpRequest",
	"WebSocket",
	"importScripts",
	"sendBeacon",

	// Storage
	"localStorage",
	"sessionStorage",
	"indexedDB",
	"cookie",

	// DOM Manipulation
	"write",
	"createElement",
	"innerHTML",
	"outerHTML",
	"insertAdjacentHTML",

	// Script Execution
	// "eval",
	"Function",
	"setTimeout",
	"setInterval",

	// Window/Frame Access
	"open",
	"parent",
	"frames",
	"postMessage",

	// Browser Features
	"serviceWorker",
	"geolocation",
	"requestFullscreen",
	"Notification",

	// Workers
	"Worker",
	"SharedWorker",

	// Others
	"history",
	"location",
	"document",
	"window",
	"print", // gonna be honest i forgot this even existed
	"alert",
];
function deThrow(code) {
	const wrappedCode = `(function() {${code}})();`; // Wrap code in IIFE
	try {
		const ast = acorn.parse(wrappedCode, {
			ecmaVersion: "latest",
		});

		// Traverse and modify the AST
		const transformedAst = estraverse.replace(ast, {
			enter(node) {
				if (node.type === "ThrowStatement") {
					return {
						type: "ExpressionStatement",
						expression: {
							type: "CallExpression",
							callee: {
								type: "Identifier",
								name: "showError",
							},
							arguments: [node.argument],
						},
					};
				}
				// Remove potentially dangerous APIs
				if (
					node.type === "Identifier" &&
					dangerousAPIs.includes(node.name)
				) {
					return {
						type: "Identifier",
						name: "undefined",
					};
				}
			},
		});

		// Generate the transformed code and unwrap it from IIFE
		const transformedCode = astring.generate(transformedAst);
		// Extract the code from inside the IIFE wrapper
		return transformedCode.slice(17, -7); // Remove "(function() {" and "})();"
	} catch (error) {
		console.error("Error in deThrow transformation:", error);
		return code; // Return original code if transformation fails
	}
}
// Initialize CodeMirror
/*
const editor = CodeMirror.fromTextArea(
  document.getElementById("code"),
  {
    mode: "javascript",
    theme: "default",
    autofocus: true,
    autocompletion: true,
    lineNumbers: true,
  }
);*/

let audioContext;
let scriptNode;
let globalTime = 0;
let errorCount = 0;
const SAMPLE_RATE = 48000;
const ERROR_LOG_LIMIT = 100;

const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
let zoomLevel = 1;

document.getElementById("zoom").addEventListener("input", (e) => {
	zoomLevel = e.target.value;
});

function drawWaveform(leftData, rightData, errorIndices = []) {
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);

	const isMono = leftData.every((v, i) => v === rightData[i]);

	// Draw waveform with appropriate color
	ctx.beginPath();
	ctx.strokeStyle = isMono ? "white" : "green";
	leftData.forEach((value, index) => {
		const x = (index / leftData.length) * canvasWidth * zoomLevel;
		const y = (1 - (value + 1) / 2) * canvasHeight;
		if (index === 0) {
			ctx.moveTo(x, y);
		} else {
			ctx.lineTo(x, y);
		}
	});
	ctx.stroke();

	if (!isMono) {
		ctx.beginPath();
		ctx.strokeStyle = "magenta";
		rightData.forEach((value, index) => {
			const x = (index / rightData.length) * canvasWidth * zoomLevel;
			const y = (1 - (value + 1) / 2) * canvasHeight;
			if (index === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();
	}

	// Draw red bars for error samples
	errorIndices.forEach((index) => {
		const x = (index / leftData.length) * canvasWidth * zoomLevel;
		ctx.fillStyle = "red";
		ctx.fillRect(x, 0, 1, canvasHeight);
	});
}
function isValidAudioValue(value) {
	if (Array.isArray(value)) {
		return (
			value.length === 2 &&
			value.every(
				(v) => typeof v === "number" && isFinite(v) && !isNaN(v)
			)
		);
	}
	return typeof value === "number" && isFinite(value) && !isNaN(value);
}

function createAudioProcessor(code) {
	code = deThrow(code);
	let processor = null;
	let lastValidProcessor = () => 0; // Start with a processor that sends silence

	function compileProcessor() {
		try {
			const constructorFunction = new Function(
				"E",
				"LN2",
				"LN10",
				"LOG2E",
				"LOG10E",
				"PI",
				"SQRT1_2",
				"SQRT2",
				"abs",
				"acosh",
				"asin",
				"asinh",
				"atan",
				"atan2",
				"atanh",
				"cbrt",
				"ceil",
				"clz32",
				"cos",
				"cosh",
				"exp",
				"expm1",
				"floor",
				"fround",
				"hypot",
				"imul",
				"log",
				"log1p",
				"log2",
				"log10",
				"max",
				"min",
				"pow",
				"random",
				"round",
				"sign",
				"sin",
				"sinh",
				"sqrt",
				"tan",
				"tanh",
				"trunc",
				"int",
				code
			);
			const generatorFunction = constructorFunction(
				Math.E,
				Math.LN2,
				Math.LN10,
				Math.LOG2E,
				Math.LOG10E,
				Math.PI,
				Math.SQRT1_2,
				Math.SQRT2,
				Math.abs,
				Math.acosh,
				Math.asin,
				Math.asinh,
				Math.atan,
				Math.atan2,
				Math.atanh,
				Math.cbrt,
				Math.ceil,
				Math.clz32,
				Math.cos,
				Math.cosh,
				Math.exp,
				Math.expm1,
				Math.floor,
				Math.fround,
				Math.hypot,
				Math.imul,
				Math.log,
				Math.log1p,
				Math.log2,
				Math.log10,
				Math.max,
				Math.min,
				Math.pow,
				Math.random,
				Math.round,
				Math.sign,
				Math.sin,
				Math.sinh,
				Math.sqrt,
				Math.tan,
				Math.tanh,
				Math.trunc,
				parseInt
			);

			const testResult = generatorFunction(0, SAMPLE_RATE);
			processor =
				typeof testResult === "function"
					? testResult
					: generatorFunction;
			lastValidProcessor = processor; // Update the last valid processor
		} catch (error) {
			console.error("Error creating audio processor:", error);
			document.getElementById("error").innerHTML =
				"<pre>thrown:" + error + "</pre>";
			processor = lastValidProcessor; // Use the last valid processor
		}
	}

	compileProcessor(); // Compile the processor initially

	errorCount = 0;

	return function (e) {
		const output = e.outputBuffer.getChannelData(0);
		const output2 = e.outputBuffer.getChannelData(1);

		const leftData = [];
		const rightData = [];
		const errorIndices = [];

		for (let i = 0; i < e.outputBuffer.length; i++) {
			globalTime += 1 / SAMPLE_RATE;

			try {
				let result = processor(globalTime, SAMPLE_RATE);

				/* if (!isValidAudioValue(result)) {
          if (errorCount < ERROR_LOG_LIMIT) {
            console.error(
              `Invalid audio output at ${globalTime}:`,
              result
            );
            errorCount++;
            if (errorCount === ERROR_LOG_LIMIT) {
              console.warn(
                "Further error messages suppressed"
              );
            }
          }
          result = 0;
          errorIndices.push(i);
        } */

				if (Array.isArray(result)) {
					output[i] = Math.max(-1, Math.min(1, result[0]));
					output2[i] = Math.max(-1, Math.min(1, result[1]));
					leftData.push(result[0]);
					rightData.push(result[1]);
				} else {
					output[i] = output2[i] = Math.max(-1, Math.min(1, result));
					leftData.push(result);
					rightData.push(result);
				}
			} catch (error) {
				if (errorCount < ERROR_LOG_LIMIT) {
					console.error(`Runtime error at ${globalTime}:`, error);
					errorCount++;
					if (errorCount === ERROR_LOG_LIMIT) {
						console.warn("Further error messages suppressed");
					}
				}
				output[i] = output2[i] = 0;
				leftData.push(0);
				rightData.push(0);
				errorIndices.push(i);

				// Attempt to recompile the processor
				compileProcessor();
			}
		}
		drawWaveform(leftData, rightData, errorIndices);
	};
}
function initializeAudioContext() {
	if (audioContext) {
		audioContext.close();
	}

	audioContext = new (window.AudioContext || window.webkitAudioContext)();

	const gainNode = audioContext.createGain();
	gainNode.connect(audioContext.destination);

	scriptNode = audioContext.createScriptProcessor(4096, 0, 2);
	scriptNode.connect(gainNode);

	// Set initial volume
	const volumeControl = document.getElementById("volume");
	gainNode.gain.value = volumeControl.value / 100;

	// Reattach volume listener
	const updateVolume = (e) => {
		gainNode.gain.value = e.target.value / 100;
		document.getElementById(
			"volumeLabel"
		).textContent = `Volume: ${e.target.value}%`;
	};
	volumeControl.removeEventListener("input", updateVolume);
	volumeControl.addEventListener("input", updateVolume);

	scriptNode.onaudioprocess = createAudioProcessor(
		editor.state.doc.toString()
	);
}

document.getElementById("play").addEventListener("click", () => {
	try {
		document.getElementById("error").classList.add("hidden");

		if (!audioContext) {
			initializeAudioContext();
		} else {
			scriptNode.onaudioprocess = createAudioProcessor(
				editor.state.doc.toString()
			);
		}
	} catch (error) {
		console.error("Error initializing audio:", error);
		scriptNode.onaudioprocess = (e) => {
			const output = e.outputBuffer.getChannelData(0);
			const output2 = e.outputBuffer.getChannelData(1);
			for (let i = 0; i < e.outputBuffer.length; i++) {
				output[i] = output2[i] = 0;
			}
		};
	}
});

document.getElementById("stop").addEventListener("click", () => {
	document.getElementById("error").classList.add("hidden");
	if (scriptNode) {
		scriptNode.onaudioprocess = null;
	}
	globalTime = 0;
	errorCount = 0;
	ctx.clearRect(0, 0, canvasWidth, canvasHeight);
});
