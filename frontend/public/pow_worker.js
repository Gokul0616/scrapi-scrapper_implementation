self.onmessage = async function (e) {
    const { nonce, difficulty } = e.data;

    const startTime = Date.now();
    let solution = 0;
    const target = "0".repeat(difficulty);

    // Simple SHA-256 implementation or use SubtleCrypto if available in worker
    // For simplicity and speed in a worker, we loop until we find the solution
    while (true) {
        const data = nonce + solution;
        const msgUint8 = new TextEncoder().encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex.startsWith(target)) {
            self.postMessage({
                solution,
                duration_ms: Date.now() - startTime,
                hash: hashHex
            });
            break;
        }
        solution++;

        // Safety break for extremely high difficulty (should not happen normally)
        if (solution > 500000) {
            self.postMessage({ error: "Max iterations reached" });
            break;
        }
    }
};
