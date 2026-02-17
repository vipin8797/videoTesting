
//Requiring Dependencies
import "dotenv/config";
import express from "express";
import path from "path";
import ejs from "ejs";
import {fileURLToPath} from "url";
import {createServer} from "http";

//Requiring Files
import getSocket from "./config/io.js";
import connectDb from "./config/dbConnect.js";


//Using Dependencies
const app = express();
const server = createServer(app);
const io = getSocket(server);

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


//Middlewares
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"/public")));
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

// app.use((req,res,next)=>{
//     console.log("got req");
//     next();
// })

//Routes
app.get("/",(req,res)=>{
    res.render("index");
})



//Apppp
const PORT = process.env.PORT;
// connectDb()
// .then(()=>{ 

// })
// .catch((err)=>{
//     console.log("APP Crash");
//     console.log(err);
// })
server.listen( PORT,()=>{
    console.log(`listening at ${PORT}`);
})