import { createCommunicationChannel as createCommChannel } from "./communication.js";

export const defaultIframeSrcDoc = `\
<!doctype html>
<html>
	<head>
		<meta name="charset" content="utf8">
		<title>Gravastar frame {{ id }}</title>
	</head>
	<body>
	</body>
</html>\
`;

export const defaultFrameOptions = {
	id: "",
	src: null,
	width: null,
	height: null,
	DOMContent:
		"<h1>This is a Gravastar IFrame.</h1>\n<h2 style='text-align: right'>{{ id }}</h2>",
	sandbox: "",
	allowlist: "",
};

export function createIframe(frameOptions = {}) {
	const options = { ...defaultFrameOptions, ...frameOptions };
	const frame = document.createElement("iframe");
	const frameId = options.id || crypto.randomUUID().split("-")[0];

	frame.promise = new Promise((resolve) => {
		frame.addEventListener(
			"load",
			() => {
				frame.id = frameId;
				frame.contentWindow.gravastarId = frameId;
				frame.contentWindow.communicationChannel = createCommChannel();
				frame.contentWindow.onmessage = console.log;

				Object.defineProperties(frame.contentWindow, {
					frameElement: {
						value: null,
						writable: false,
					},
					parent: {
						value: null,
						writable: false,
					},
					// top: {
					// 	value: null,
					// 	writable: false,
					// },
					opener: {
						value: null,
						writable: false,
					},
					frames: {
						value: frame.contentWindow,
						writable: false,
					},
				});

				frame.contentWindow.eval(
					`
						window.sandboxReady = import("./nyariv-sandboxjs/Sandbox.js")
							.then((module) => module.default)
							.then((Sandbox) => {
								window.SandboxGlobals = {
									...Object
										.getOwnPropertyNames(window)
										.reduce((acc, cur) => ((acc[cur] = window[cur]), acc), {})
								}

								window.SandboxPrototypes = new Map( // allow all prototypes
									Object.getOwnPropertyNames(window)
										.filter(p => /^[A-Z]/.test(p))
										.map(proto => [window[proto], new Set()])
								).set(
									Object,
									new Set([
				            'entries',
				            'fromEntries',
				            'getOwnPropertyNames',
				            'is',
				            'keys',
				            'hasOwnProperty',
				            'isPrototypeOf',
				            'propertyIsEnumerable',
				            'toLocaleString',
				            'toString',
				            'valueOf',
				            'values',
					        ])
					      );

								window.SandboxGlobals.frameElement = null
								window.SandboxGlobals.opener = null
								window.SandboxGlobals.frames =
								window.SandboxGlobals.parent =
								window.SandboxGlobals.top =
								window.SandboxGlobals
						
								window.Sandbox = new Sandbox({
									globals: window.SandboxGlobals,
									prototypeWhitelist: window.SandboxPrototypes
								})
							})
							.then(() => {
								window.SandboxScope = {}
								window.Code = class Code {
									static run(code) {
										return window
											.Sandbox
											.compileAsync(
												window.Babel.transform(code, {
													presets: ["es2015"],
													targets: "defaults"
												}).code
											)(window.SandboxScope).run();
									}
								}
							})
							.then(() => {
								const babelScript = document.createElement("script")
								babelScript.src = "gravastar/babel-standalone/babel.min.js"
								document.head.appendChild(babelScript)

								return new Promise((resolve, reject) => {
									babelScript.onload = () => {
										babelScript.onload = null
										resolve()
									}
									babelScript.onerror = (error) => {
										babelScript.onerror = null
										reject(error)
									}
								})
							})
					`,
				);
				frame.contentWindow.sandboxReady.then(resolve).catch((err) => {
					throw err;
				});
			},
			{ once: true },
		);
	});

	Object.defineProperties(frame, {
		sandbox: {
			value: `allow-same-origin ${options.sandbox}`.trim(),
			writable: false,
		},
	});

	options.width && (frame.width = options.width);
	options.height && (frame.height = options.height);
	if (options.src) frame.src = options.src;
	else {
		frame.src = location.href;
		frame.srcdoc = defaultIframeSrcDoc
			.replace("<body>", `<body>\n\t${options.DOMContent}`)
			.replace(/\{\{\s*id\s*\}\}/g, frameId);
	}

	return frame;
}
