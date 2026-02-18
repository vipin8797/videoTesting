import {Server } from "socket.io";

   
const getSocket  = (socket)=>{
    let allUsers = {};
    const io = new Server(socket);
    
   io.on("connection",(Socket)=>{
    console.log("socket:",Socket.id);

    Socket.on("join-user",(username)=>{
        console.log("joined:",username);
        allUsers[username] = {username, id:Socket.id};
        io.emit("joined",allUsers);
    })
  

   //listening for offer
   Socket.on("offer", ({ to, from, offer }) => {
      console.log("Offer transfering from", from, "to", to);
      console.log(allUsers[to]);
      Socket.to(allUsers[to].id).emit("offer",({from:from, offer:offer}));
   });
   
   Socket.on("busy", ({ to }) => {

  if (!allUsers[to]) return;

  Socket.to(allUsers[to].id).emit("busy", {
    msg: "User is busy on another call"
  });

});


   Socket.on("call-rejected",({to})=>{
       Socket.to(allUsers[to].id).emit("call-rejected",({from:to}));
   })

  Socket.on("icecandidate", ({to, from, candidate}) => {
    console.log("transfering canidate");
    console.log(to);
   Socket.to(allUsers[to].id).emit("icecandidate", {
       from,
       candidate
   });
});


   Socket.on("answer", ({to, answer})=>{
    console.log("tranfering answer back");
    Socket.to(allUsers[to].id).emit("answer",(answer));
   })


  Socket.on("end-call",({from , to})=>{
    Socket.to(allUsers[to.id]).emit('end-call',({from:from, to:to}));
  })


 });
   return io;
}
    

export default getSocket;