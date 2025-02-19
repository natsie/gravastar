export const _receivers = new Map();
export function createCommunicationChannel({
	id,
	receivers = [],
	exposedFunctions = {},
} = {}) {
	if (Array.isArray(receivers)) {
		for (const receiver of receivers) {
			if (
				!receiver.id ||
				typeof receiver.id !== "string" ||
				_receivers.has(receiver.id)
			) {
				throw new Error(
					`Receiver ID ${receiver.id} invalid or already commissioned.`,
				);
			}
		}
		for (const receiver of receivers) _receivers.set(receiver.id, receiver);
	}

	const __receiver = {
		id: id || crypto.randomUUID(),
		exposedFunctions: {
			...exposedFunctions,
		},
		pendingRequests: new Map(),
		callReceiver: function (id, method, ...args) {
			const receiver = _receivers.get(id);
			return new Promise((resolve, reject) => {
				const callId = crypto.randomUUID();
				receiver.postMessage({
					id: callId,
					caller: this.id,
					method,
					arguments: args,
					resolve,
					reject,
				});
			});
		},
		postMessage: function (data) {
			const method = data.method;
			if (!this.exposedFunctions[method]) {
				const { reject } = this.pendingRequests.get(data.id);
				return reject(
					new ReferenceError(
						"This receiver does NOT handle the requested method: " + method,
					),
				);
			}

			Promise.resolve(this.exposedFunctions[method](...data.arguments))
				.then((res) => data.resolve?.(res))
				.catch((err) => data.reject?.(err));
		},
	};

	_receivers.set(__receiver.id, __receiver);
	return __receiver;
}
