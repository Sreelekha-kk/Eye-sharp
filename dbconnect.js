const mongoose = require ("mongoose")

const session = require('express-session');


const dbConnect=()=>{


    const MongoDBSession = require("connect-mongodb-session")(session);


    const mongoURI="mongodb://127.0.0.1:27017/user_management_system"
    mongoose.connect(mongoURI,{
        useNewUrlParser: true,
        
        useUnifiedTopology: true,
    })
    
    
    const Store = new MongoDBSession({
        uri: mongoURI,
        collection: "userSessions",
      });

}
module.exports= dbConnect

   