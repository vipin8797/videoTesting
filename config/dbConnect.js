import mongoose from "mongoose";

const DbURL = process.env.MONGO_URL;

const connectDb = async()=>{
    try{
     mongoose.connect(DbURL)
     .then(()=>{
        console.log("DB connected");
     })

    }catch(err){
        console.log("DB connection fail");
        console.log(err);
    }
}

export default connectDb;