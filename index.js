
const mongoose = require ("mongoose")

const express = require("express")
const app = express()

const session = require('express-session');

const dbConnect=require('./dbconnect')
// dbConnect();
const MongoDBSession = require("connect-mongodb-session")(session);


const mongoURI="mongodb+srv://kksree123321:zoNOeo8iCxosZfZB@cluster0.jnjq5yz.mongodb.net/"
mongoose.connect(mongoURI,{
    useNewUrlParser: true,
    
    useUnifiedTopology: true,
})


const userStore = new MongoDBSession({
    uri: mongoURI,
    collection: "userSessions",
  });
  
  const adminStore = new MongoDBSession({
    uri: mongoURI,
    collection: "adminSessions",
  });
  const userSession = session({
    secret: 'userSecret',
    resave: false,
    saveUninitialized: true,
    store: userStore,
    name: 'user_sid',
    cookie: { path: '/' }
  });
  
  const adminSession = session({
    secret: 'adminSecret',
    resave: false,
    saveUninitialized: true,
    store: adminStore,
    name: 'admin_sid',
    cookie: { path: '/admin' }
  });
  



app.use(express.urlencoded({extended : true}))
app.use(express.json())
app.use(express.static("views"));

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("views"));

// Use no-cache
const nocache = require("nocache");
app.use(nocache());




const userRouter = require('./routes/userRoute');

const adminRouter = require('./routes/adminRoute');
 
app.use('/admin', (req, res, next) => {
  return next();
}, adminSession, adminRouter);

app.use('/', (req, res, next) => {
  return next();
}, userSession, userRouter);

app.get('*',(req,res)=>{
    res.render("404")
})




app.listen(3000,()=>{
    console.log("server started")
})