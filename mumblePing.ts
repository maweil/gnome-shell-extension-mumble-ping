import Gio from "gi://Gio";
const MUMBLE_PING_BODY = [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const MUMBLE_PING_RESPONSE_LEN = 24;

Gio._promisify(
  Gio.SocketClient.prototype,
  "connect_to_host_async",
  "connect_to_host_finish",
);
Gio._promisify(Gio.OutputStream.prototype, "write_async", "write_finish");
Gio._promisify(
  Gio.InputStream.prototype,
  "read_bytes_async",
  "read_bytes_finish",
);

function _readUInt32BE(bytes: Uint8Array, startPosition: number) {
  let result = 0;
  let shift = 24;
  for (let i = startPosition; i < startPosition + 4; i++) {
    result += bytes[i] << shift;
    shift -= 8;
  }
  return result;
}

function _parseResponseBytes(responseBytes: Uint8Array) {
  const version = [];
  for (let i = 1; i < 4; i++) version.push(Number(responseBytes[i]));

  const versionStr = version.join(".");
  const numUsersConnected = _readUInt32BE(responseBytes, 12);
  const numMaxUsers = _readUInt32BE(responseBytes, 16);
  const bandwidth = _readUInt32BE(responseBytes, 20);
  const result = {
    version: versionStr,
    users: numUsersConnected,
    maxUsers: numMaxUsers,
    bandwidth,
  };
  return result;
}

async function _writeByteString(
  connection: Gio.SocketConnection,
  byteString: Iterable<number>,
  cancellable: Gio.Cancellable,
) {
  const bytesWritten = await connection.outputStream.write_async(
    Uint8Array.from(byteString),
    0,
    cancellable,
  );
  return bytesWritten;
}

/**
 * Read n bytes from Socket Connection (cancellable)
 *
 * @param connection
 * @param numBytesToRead
 * @param cancellable
 */
function _readBytesFromConnection(
  connection: Gio.SocketConnection,
  numBytesToRead: number,
  cancellable: Gio.Cancellable,
) {
  return connection.inputStream.read_bytes_async(
    numBytesToRead,
    0,
    cancellable,
  );
}

export interface MumblePingResult {
  version?: string;
  users: number;
  maxUsers: number;
  bandwidth?: number;
}

/**
 * Creates an UDP socket to ping the Mumble server
 *
 * @param host Hostname of the Mumble server
 * @param port Port of the Mumble server
 * @param cancellable Gio.Cancellable to be able to cancel ongoing operations
 * @returns Promise resolving with UDP socket
 */
export function createClient(
  host: string,
  port: number,
  cancellable: Gio.Cancellable | null = null,
) {
  const udpSocket = new Gio.SocketClient();
  udpSocket.protocol = Gio.SocketProtocol.UDP;
  udpSocket.type = Gio.SocketType.DATAGRAM;
  return udpSocket.connect_to_host_async(host, port, cancellable);
}

/**
 *
 * @param connection
 * @param cancellable
 */
export async function pingMumble(
  connection: Gio.SocketConnection,
  cancellable: Gio.Cancellable,
): Promise<MumblePingResult> {
  await _writeByteString(connection, MUMBLE_PING_BODY, cancellable);
  const responseBytes = await _readBytesFromConnection(
    connection,
    MUMBLE_PING_RESPONSE_LEN,
    cancellable,
  );
  return _parseResponseBytes(responseBytes.get_data() || Uint8Array.from([]));
}
