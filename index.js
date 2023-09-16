
const mongoose = require ("mongoose")

const express = require("express")
const app = express()

const session = require('express-session');


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

app.use(session({
    secret: 'your-secret-key', // Replace with a secure random string
    resave: false,
    saveUninitialized: true,
    store:Store
}));



app.use(express.urlencoded({extended : true}))
app.use(express.json())

app.set('view engine', 'ejs')
app.set('views','./views')
// app.use('/public',express.static(path.join(__dirname,'public')))
app.use(express.static('views'))


const nocache = require("nocache");
app.use(nocache());

const userRoute = require('./routes/userRoute')
app.use("/", userRoute)


const adminRoute=require('./routes/adminRoute')
app.use("/admin",adminRoute)

// app.get('*',(req,res)=>{
//     res.render("404")
// })




app.listen(3000,()=>{
    console.log("server started")
})