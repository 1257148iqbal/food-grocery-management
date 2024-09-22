const zlib = require('zlib');

exports.decompressedResponse = response => {
    return new Promise((resolve, reject) => {
        // Step 1: Decode Base64
        const decodedBuffer = Buffer.from(response, 'base64');

        // Step 2: Decompress GZIP
        zlib.gunzip(decodedBuffer, (err, decompressedBuffer) => {
            if (err) {
                console.error('Error decompressing GZIP:', err);
                reject({ status: false, message: err.message });
            } else {
                // Step 3: Convert decompressed buffer to string
                const decodedString = decompressedBuffer.toString('utf-8');

                // Step 4: Parse the JSON string to a JavaScript object
                const responseObject = JSON.parse(decodedString);

                resolve({ status: true, responseObject });
            }
        });
    });
};
