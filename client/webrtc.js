let localStream;
let localVideo;
let peerConnection;
let remoteVideo;
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

  localVideo = document.getElementById('localVideo');
  remoteVideo = document.getElementById('remoteVideo');

  serverConnection = new WebSocket(`wss://${window.location.hostname}:8443`);
  serverConnection.onmessage = gotMessageFromServer;

  const constraints = {
    video: true,
    audio: true,
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;

  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track);
    });
  }

  if (isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}


function gotMessageFromServer(message) {
  if (!peerConnection) start(false);

  const signal = JSON.parse(message.data);

  // Ignore messages from ourself
  if (signal.uuid == uuid) return;

  if (signal.sdp) {
    console.log('sdp received')
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        console.log('sdp type is offer')
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
  console.log('got description');

  peerConnection.setLocalDescription(description).then(() => {
    serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  if (!remoteVideo.srcObject) {
    remoteVideo.srcObject = new MediaStream();
  }
  remoteVideo.srcObject.addTrack(event.track);
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
