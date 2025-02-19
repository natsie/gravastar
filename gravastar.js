import { createIframe } from "./iframe.js";

const defaultGravastarOptions = {
	parent: "body",
	id: null,
};
class Gravastar {
	#options;
	iframePromiseResolution = () => {
		this.iframe.ready = true;
		this.postMessage = window.postMessage.bind(this.iframe.contentWindow);
		return this;
	};

	constructor(options) {
		const _options = (this.#options = {
			...defaultGravastarOptions,
			...options,
		});
		this.iframe = createIframe(options);
		this.promise = this.iframe.promise.then(this.iframePromiseResolution);
		this.mountFrame();
	}

	mountFrame() {
		let parent = this.#options.parent;
		if (!parent) return false;
		if (parent instanceof HTMLElement) parent.appendChild(this.iframe);
		else {
			parent = document.querySelector(String(parent));
			if (parent) parent.appendChild(this.iframe);
			else return false;
		}
		return true;
	}

	runCode(code) {
		if (code instanceof Function) code = `(${code.toString()})()`;
		if (typeof code !== "string") throw new Error("Invalid code.");
		if (!this.iframe.ready) throw new Error("The iframe is not ready.");

		return this.iframe.contentWindow.Code.run(code);
	}
}

export { Gravastar, Gravastar as default };
