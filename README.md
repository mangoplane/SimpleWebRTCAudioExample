# SimpleWebRTCAudioExample

A basic, straightforward WebRTC audio streaming example.

## How to Run

The signaling server is built with Node.js and `ws`. You can initiate it as follows:

```bash
npm install
npm start
```

Once the server is up and running, use Firefox/Chrome/Safari to navigate to `https://localhost:8443`.

Bear in mind:
- Remember the 'S' in 'HTTPS'! There isn't an automatic redirection from HTTP to HTTPS.
- As our TLS certificate is self-signed and WebRTC must be executed over TLS, you'll have to accept the invalid certificate.
- Depending on your browser or operating system, simultaneous webcam usage across multiple pages might not be possible. In that case, consider using two different browsers or computers.

## Encountered Any Issues?

This is a compact example, and I don't update it frequently. Therefore, I depend on user reports if something malfunctions. Your issues and pull requests are highly appreciated.
