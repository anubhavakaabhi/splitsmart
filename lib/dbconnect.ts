import mongoose from "mongoose";

type connectionObject = {
    isConnected? : number
}

const connection : connectionObject = {}

async function dbConnect() : Promise<void> {
    if(connection.isConnected){
        console.log("Alreaady connected to db");
        return 
    }
    
    try{
        const db = await mongoose.connect(process.env.MONGODB_URI as string)
        connection.isConnected = db.connections[0].readyState
        console.log("Connected to db")
    }
    catch (error){
        console.log("Error connecting to db", error)
        process.exit(1)
    }
}