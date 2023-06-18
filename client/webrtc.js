let localStream;
let localAudio;
let peerConnection;
let remoteAudio;
let serverConnection;
let uuid;

const peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

function pageReady() {
  uuid = createUUID();

  localAudio = document.getElementById('localAudio');
  remoteAudio = document.getElementById('remoteAudio');

  serverConnection = new WebSocket(`wss://${window.location.hostname}:8443`);
  serverConnection.onmessage = gotMessageFromServer;

  // Enumerate microphones and populate the dropdown
  enumerateDevices();

}

function enumerateDevices() {
  let micSelect = document.getElementById('micSelect');

  navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
      devices.forEach(function (device) {
        if (device.kind === 'audioinput') {
          let option = document.createElement('option');
          option.text = device.label || 'Microphone ' + (micSelect.length + 1);
          option.value = device.deviceId;
          micSelect.appendChild(option);
        }
      });
    })
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localAudio.srcObject = stream;

  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track);
    });
  }

  peerConnection.createOffer().then(createdDescription).catch(errorHandler);
}

function start() {
  let micSelect = document.getElementById('micSelect');
  let constraints = {
    video: false,
    audio: {
      deviceId: { exact: micSelect.value }
    },
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }

  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
}

function gotMessageFromServer(message) {
  if (!peerConnection) start(false);

  const signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if (signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }));
  }
}

function createdDescription(description) {
  peerConnection.setLocalDescription(description).then(() => {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  if (!remoteAudio.srcObject) {
    remoteAudio.srcObject = new MediaStream();
  }
  remoteAudio.srcObject.addTrack(event.track);
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
}
