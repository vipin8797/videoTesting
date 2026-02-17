const createUserButton = document.getElementById("create-user");
const username = document.getElementById("username");
// const socket = io({
//     reconnection: true,
//     reconnectionAttempts: 5,
//     reconnectionDelay: 1000
//   });
const socket = io( {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

const allUsersHtml = document.getElementById("allusers");
const badge = document.getElementById("connection-badge");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
let peerConnectionObj;
let localStream;
let toUser;

//Function to create peerConnection
const PeerConnection = (function(){
    let peerConnection;

const createPeerConnection = () => {

  const config = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302"
        ]
      }
    ]
  };

  peerConnection = new RTCPeerConnection(config);

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Remote stream listener
  peerConnection.ontrack = function (event) {
    console.log("ontrack fired");
    remoteVideo.srcObject = event.streams[0];
  };

  // ICE candidate listener
  peerConnection.onicecandidate = function (event) {
    console.log("onicecandidate fired.");
    // console.log("iceCandidate to,",toUser);
    if (event.candidate) {
      // send via signaling
      socket.emit("icecandidate",({to:toUser,from:username.value, candidate:event.candidate}));
    }
  };

  return peerConnection;
};

return {
    getInstance: ()=> {
        if(!peerConnection){
            peerConnection = createPeerConnection();
        }
        return peerConnection;
    },

    destroy: ()=>{
        if(peerConnection){
            peerConnection.close();
            peerConnection = null;
        }
    },
   resetConnection:()=>{
         if(peerConnection){
            peerConnection.close();
            // peerConnection = null;
         }
         peerConnection = createPeerConnection();
         return peerConnection;
   }
}
})();
    







function attachConnectionListeners(pc) {

  pc.addEventListener("connectionstatechange", updateConnectionStatus);
  pc.addEventListener("iceconnectionstatechange", updateConnectionStatus);
  pc.addEventListener("signalingstatechange", updateConnectionStatus);

}

function updateConnectionStatus() {
  if (!peerConnectionObj) return;

  const connectionBadge = document.getElementById("connection-state-badge");
  const iceBadge = document.getElementById("ice-connection-state-badge");
  const signalingBadge = document.getElementById("signaling-state-badge");
  const iceGatheringBadge = document.getElementById("iceGathering-state-badge");

  if (connectionBadge)
    connectionBadge.textContent = peerConnectionObj.connectionState;

  if (iceBadge)
    iceBadge.textContent = peerConnectionObj.iceConnectionState;

  if (signalingBadge)
    signalingBadge.textContent = peerConnectionObj.signalingState;

 if (iceGatheringBadge)
    iceGatheringBadge.textContent = peerConnectionObj.iceGatheringState;
}




//Remote clinet side code
socket.on("icecandidate", async({from,candidate})=>{
    if(peerConnectionObj){
        if(!peerConnectionObj.remoteDescription){
            console.log("rolling back");
            return;
        }
        await peerConnectionObj.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("ice candidate accepted");
    }
})
 
//function to show popup for call
async function showCallPopup(from, offer) {

  const accept = confirm(`${from} is calling you. Accept?`);

  if (accept) {
        console.log("call accepted");
   
         toUser = from;
    if(!peerConnectionObj){
        return;
    }
    try{
     if (peerConnectionObj.signalingState !== "stable") {
    await peerConnectionObj.setLocalDescription({ type: "rollback" });
}

      //setting offer to remote description
      await peerConnectionObj.setRemoteDescription(offer);
      //creating answer

     const answer = await peerConnectionObj.createAnswer();
     //setting answer in localDescription
     await peerConnectionObj.setLocalDescription(answer);


      socket.emit("answer",({to:from, answer: peerConnectionObj.localDescription}));
      console.log("answer sent");
    }catch(err){
        console.log(err);
    }
   



  } else {


    socket.emit("call-rejected", { to: from });
    console.log("call rejected");
  }
}


socket.on("offer", async({from, offer})=>{

 //1.check if already on any call
   if(peerConnectionObj && peerConnectionObj.connectionState === "connected"){
       socket.emit("busy", { to: from });
       return;
   }


//2. accept or reject calll.
   showCallPopup(from,offer);
});



// Initializing video/audio
const startMyVideo = async()=>{
    try{
       const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
       localStream = stream;
       console.log("Streams: ",stream);
       console.log("id: ",stream.id);
       console.log("isActive: ",stream.active);
       console.log("Tracks: ",stream.getTracks());

       localVideo.srcObject  = stream;
    }catch(err){
        console.log(err);
    }
}


socket.on("connect", async() => {
    console.log("socket connection to backend.");
    
  console.log("socket.id:", socket.id);
  await startMyVideo();
  peerConnectionObj = PeerConnection.getInstance();
  attachConnectionListeners(peerConnectionObj);
  updateConnectionStatus(); // initial snapshot
  console.log(peerConnectionObj);
   







//Handle Browser Events
createUserButton.addEventListener("click",(e)=>{
    if(username.value !== ""){
      socket.emit("join-user",username.value);
    }
});




socket.on("joined",(allUsers)=>{
  console.log(allUsers);

  const createUserHtml = () => {
  allUsersHtml.innerHTML = "";

  for(const user of Object.keys(allUsers)) {
      const li = document.createElement("li");


    // username text
    li.textContent =
      user === username.value ? `${user} (YOU)` : user;

    // add call button only for other users
    if (user !== username.value) {

      const callBtn = document.createElement("button");
      callBtn.classList.add("call-btn");

      const img = document.createElement("img");
      img.setAttribute("src", "/images/phone.png");
      img.setAttribute("width", "20");

      callBtn.appendChild(img);
      li.appendChild(callBtn);

      li.addEventListener("click", ()=>{
          startCall(user);
          toUser = user;
      })
    }

    // append li ALWAYS
    allUsersHtml.appendChild(li);
  }
};

    createUserHtml();
})


socket.on("busy",async({msg})=>{
    console.log(msg);
    peerConnectionObj.close();
    peerConnectionObj = PeerConnection.destroy();
    peerConnectionObj = PeerConnection.resetConnection();
    
})

socket.on("answer",async(answer)=>{
    try{
     await peerConnectionObj.setRemoteDescription(answer);
     console.log("got answer");
     callMonitor(peerConnectionObj);
    }catch(err){
        console.log(err);
    }
})


socket.on("call-rejected", async({from})=>{
    console.log("call rejected");
      peerConnectionObj.resetConnection();

})

});



//Start Call function
const startCall =  async(user)=>{
    if(!peerConnectionObj){
        console.log("peer object not found");
        return;
    }
    if(peerConnectionObj.signalingState !== "stable"|| peerConnectionObj.iceConnectionState !== "new" ||
        peerConnectionObj.connectionState !== "new" || peerConnectionObj.iceGatheringState !== "new"){
        console.log("configuring peer again");
        peerConnectionObj = PeerConnection.getInstance();
        
    }
    console.log("calling to ,",user);
    try{
  

        toUser = user;

        const offer = await peerConnectionObj.createOffer();
        await peerConnectionObj.setLocalDescription(offer);
        console.log(peerConnectionObj);
        socket.emit("offer", {
            from: username.value,
            to: user,
            offer: peerConnectionObj.localDescription
        });

        console.log("Offer sent to: ",user); 
    }catch(err){
        console.log(err);
    }
}









//disconnect socket after login.
window.addEventListener("beforeunload",()=>{
    if(socket){
        socket.disconnect();
    }
})


//call monitoring function
function callMonitor(pcObject){

    if (!pcObject) return;

    const handler = () => {

        const state = pcObject.connectionState;
        console.log("connectionState:", state);

        if(state === "connecting"){
            console.log("call connecting");
        }

        if(state === "connected"){
            console.log("call connected");
        }

        if(state === "disconnected"){
            console.log("Temporary network issue");

            const currentPc = pcObject;

            setTimeout(() => {
                if (
                    currentPc.connectionState === "disconnected"
                ) {
                    console.log("ending call");
                    // endCallCleanup();
                    console.log("call ending");
                }
            }, 5000);
        }

        if(state === "failed"){
            console.log("call failed");
            // endCallCleanup();
            console.log("call ending");
        }

        if(state === "closed"){
            console.log("call closed");
        }

    };
    
//adding event listners to connectionState
    pcObject.addEventListener("connectionstatechange", handler);

}
