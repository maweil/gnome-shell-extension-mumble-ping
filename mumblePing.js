const Gio = imports.gi.Gio;
const ByteArray = imports.byteArray;
const MUMBLE_PING_BODY = '000012345678';

Gio._promisify(
    Gio.SocketClient.prototype,
    'connect_to_host_async',
    'connect_to_host_finish'
);
Gio._promisify(Gio.OutputStream.prototype, 'write_async', 'write_finish');
Gio._promisify(
    Gio.InputStream.prototype,
    'read_bytes_async',
    'read_bytes_finish'
);

function _readUInt32BE(bytes, startPosition) {
    let result = 0;
    let shift = 24;
    for (let i = startPosition; i < startPosition + 4; i++) {
        result += bytes[i] << shift;
        shift -= 8;
    }
    return result;
}

function _parseResponseBytes(responseBytes) {
    let version = [];
    for (let i = 1; i < 4; i++)
        version.push(Number(responseBytes[i]));

    let versionStr = version.join('.');
    let numUsersConnected = _readUInt32BE(responseBytes, 12);
    let numMaxUsers = _readUInt32BE(responseBytes, 16);
    let bandwidth = _readUInt32BE(responseBytes, 20);
    let result = {
        version: versionStr,
        users: numUsersConnected,
        maxUsers: numMaxUsers,
        bandwidth,
    };
    return result;
}

async function writeByteStringToConnectionAsync(
    connection,
    byteString,
    cancellable
) {
    const bytesWritten = await connection.output_stream.write_async(
        Uint8Array.from(byteString),
        0,
        cancellable
    );
    return bytesWritten;
}

function readBytesFromConnectionAsync(connection, numBytesToRead, cancellable) {
    return connection.input_stream
        .read_bytes_async(numBytesToRead, 0, cancellable)
        .then(r => ByteArray.fromGBytes(r));
}

// eslint-disable-next-line no-unused-vars
function createClient(host, port, cancellable = null) {
    let udpSocket = new Gio.SocketClient();
    udpSocket.protocol = Gio.SocketProtocol.UDP;
    udpSocket.type = Gio.SocketType.DATAGRAM;
    return udpSocket.connect_to_host_async(host, port, cancellable);
}

// eslint-disable-next-line no-unused-vars
async function pingMumble(connection, cancellable) {
    await writeByteStringToConnectionAsync(
        connection,
        MUMBLE_PING_BODY,
        cancellable
    );
    const responseBytes = await readBytesFromConnectionAsync(
        connection,
        24,
        cancellable
    );
    return _parseResponseBytes(responseBytes);
}
