const { name } = require("ejs");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
require('dotenv').config();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const verifySid = process.env.VERIFY_SID;

// const accountSid = "AC864c7fe9a3d2d021ed48e32d129e9e23";
// const authToken = "969391a4a843a1eb4b66447973352b30";
// const verifySid = "VA416322cca17d99e2751157998a3eaf3c";
const client = require("twilio")(accountSid, authToken);
const Category = require("../models/categoryModel")
const Product = require("../models/productModel")
const cartHelper = require("../helpers/cartHelper")
const Banner = require("../models/bannerModel")

require("dotenv").config();



const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};


const login = async (req, res) => {
  try {
    if (req.session.user_id) {
      // User is already logged in, redirect them to another page
      return res.redirect('/home');
    }
    else{
      console.log("/uc-login");
      res.render("public/login.ejs", { message: "Your error message here" });
      
    }
    
    
  } catch (error) {
    console.log(error.message);
  }
};

const home = async (req, res,next) => {
  try {

    const categoriesToShow = 3; // Define the number of categories to show
    const category = await Category.find({}).limit(categoriesToShow); // Limit the number of categories

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit; 
   
    const totalProducts = await Product.countDocuments({ $and: [{ isListed: true }, { isProductListed: true }] }); // Get the total number of products
    const totalPages = Math.ceil(totalProducts / limit); // Calculate the total number of pages

   

    const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
      .limit(limit)
      .populate('category');
      const banner = await Banner.find({})
      console.log(banner);


res.render("public/home", { product: products, category, banners:banner, currentPage: page, totalPages });
  } catch (error) {
    console.log(error.message);
  }
};

const userPage = async (req, res) => {
  try {
    res.render("public/userPage");
  } catch (error) {
    console.log(error.message);
  }
};



const signup = async (req, res) => {
  try {
    res.render("public/signup.ejs", { message: "Your error message here" });
  } catch (error) {
    console.log(error.message);
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const existingUser = await User.findOne({$or: [{email:email}, {mobile:mobile}]})

    const spassword = await securePassword(password);
    if(!req.body.name || req.body.name.trim().length === 0){
      return res.render("public/signup", { message: "Name is required", formData: req.body})
    }
    if (/\d/.test(req.body.name)) {
      return res.render("public/signup", { message: "Name should not contain numbers", formData: req.body });
    }
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
        return res.render("public/signup", { message: "Mobile Number should have 10 digits", formData: req.body });
    }
    if(existingUser){
      return res.render("public/signup",{message:"User already registered", formData: req.body})
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)){
        return res.render("public/signup", { message: "Email Not Valid", formData: req.body });
    }
    
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if(!passwordRegex.test(req.body.password)){
        return res.render("public/signup", { message: "Password Should Contain atleast 8 characters, one number and a special character", formData: req.body });
    }


    if(req.body.password!=req.body.confPassword){
        return res.render("public/signup", { message: "Password and Confirm Password must be same", formData: req.body });
    }

    const user = new User({
      name: name,
      mobile: mobile,
      email: email,
      password: spassword,
    });

    const userdata = await user.save();

    
    
    const userData = await User.findOne({ mobile: mobile })

    if (userData) {
      client.verify.v2
        .services(verifySid)
        .verifications.create({ to: `+91${mobile}`, channel: "sms" })
        .then((verification) => console.log(verification.status))
        .then(() => {
          const readline = require("readline").createInterface({
            input: process.stdin,

            output: process.stdout,
          });
          readline.question("Please enter the OTP:", (otpCode) => {
            client.verify.v2
              .services(verifySid)
              .verificationChecks.create({ to: `+91${mobile}`, code: otpCode })
              .then((verification_check) => console.log(verification_check.status))
              .then(() => readline.close());
          });
        });
        
        console.log(user);
      res.render("public/verifyOtp", { mobile: mobile 
      
      
      });
    }

    else {
      throw new Error("can't save the user data");
    }
  } catch (error) {
    // Handle Twilio API error
    console.error('Twilio API Error:', error);
    res.render('public/error', { message: 'Error sending OTP. Please try again later.' });
  }

};

const verifyLogin = async (req, res) => {
  try {
    const category = await Category.find({});
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit; 

    

    const totalProducts = await Product.countDocuments({ $and: [{ isListed: true }, { isProductListed: true }] }); 
    const totalPages = Math.ceil(totalProducts / limit); 


    const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
      .limit(limit)
      .populate('category');
      const banner = await Banner.find({})

    console.log("verified here");
    const email = req.body.email
    const password = req.body.password
    
    const userData = await User.findOne({ email: email })
    console.log(userData);
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password)
      if (passwordMatch) {
  if (userData.is_blocked) {
    res.render('public/login', {message:"Your account is blocked"});
    console.log("you are blocked");
  } else {
    req.session.user_id = userData._id;
    req.session.username = userData.name;
    let name = userData.name;
    console.log("verified here", name);

    res.redirect('/home'); // Redirect to the home page
  }
} else {
  res.render('public/login', { message: "Password is incorrect" });
}
    } else {
      res.render('public/login', { message: "Email is incorrect" })
    }

  } catch (error) {
    console.log(error.message)

  }
}






const verifyotp = async (req, res) => {
  try {
    const otp = req.body.otp;
    console.log(otp);
    const mobile = req.body.mobile
    console.log(mobile);
    const user = await User.findOne({ mobile: mobile })
    if (!user) {
      res.render('public/verifyOtp', { message: 'Invalid Session' });
    } else {
      client.verify.v2
        .services(verifySid)
        .verificationChecks.create({ to: `+91${mobile}`, code: otp })
        .then((verification_check) => {
          console.log(verification_check.status);
          if (verification_check.status === "approved") {
            req.session.loggedIn = true;
            req.session.user_id = user;
            res.redirect('/login');
          } else if (verification_check.status === "denied") {
            res.render('public/verifyOtp', { message: 'Incorrect OTP' });
          }
        })

    }

  } catch (error) {
    console.log(error.message)
  }
}

const userLogout = async (req, res,next) => {
    try {
      req.session.user_id=null
      req.session.destroy()
      res.redirect('/login')
    } catch (error) {
      console.log(error.message)
    }
  }

const displayproduct = async (req, res,next) => {
  
    try {
      const user = res.locals.user;

      // const count = await cartHelper.getCartCount(user.id);
      const categoriesToShow = 3; // Define the number of categories to show
      const category = await Category.find({}).limit(categoriesToShow); // Limit the number of categories

      const selectedCategoryId = req.query.id || null;  // This fetches the selected category ID from the query string
      const loadMore = req.query.loadMore;
      const page = parseInt(req.query.page) || 1; 
      const limit = loadMore ? 30 : 10;
    const skip = (page - 1) * limit;


      const searchQuery = req.query.search || ''; // Get the search query from request query parameters
      const sortQuery = req.query.sort || 'default'; // Get the sort query from request query parameters (default value is 'default')
      const minPrice = parseFloat(req.query.minPrice); // Get the minimum price from request query parameters
      const maxPrice = parseFloat(req.query.maxPrice)

      // Conditionally filter products by category if a category ID is provided
      const filterCriteria = {
        $and: [
          { isListed: true },
          { isProductListed: true },
          {
            $or: [
              { name: { $regex: new RegExp(searchQuery, 'i') } },
            ]
          }] };
      if (selectedCategoryId) {
        filterCriteria.category = selectedCategoryId;
      }
 
      if (!isNaN(minPrice) && !isNaN(maxPrice)) {
        filterCriteria.$and.push({ price: { $gte: minPrice, $lte: maxPrice } });
      }

      let sortOption = {};
      if (sortQuery === 'price_asc' ||sortQuery === 'default' ) {
        sortOption = { price: 1 }; 
      } else if (sortQuery === 'price_desc') {
        sortOption = { price: -1 }; 
      }

      const totalProducts = await Product.countDocuments(filterCriteria);
      const totalPages = Math.ceil(totalProducts / limit);

      const products = await Product.find(filterCriteria)
        .skip(skip) 
        .limit(limit) 
        .sort(sortOption)
        .populate('category');
        

      res.render('public/shop', { product: products, category, selectedCategoryId, currentPage: page, totalPages,  sortQuery, loadMore });
    } catch (error) {
      console.log(error.message);
      next(error);
    }
};


const displayprofile = async (req, res) => {
  try {
    res.render("public/profile");
  } catch (error) {

    console.log(error.message);
  }
};



const success = async (req, res) => {
  try {
    res.render('public/success')
  }
  catch (error) {
    console.log(error.message)
  }
};



const loadforgetPassword = async (req, res) => {
  try {
    res.render('public/forgetPassword')
  }
  catch (error) {
    consolelog(error.message)

  }
}


const forgotPasswordOtp = async(req, res, next) => {


  
  const user = await User.findOne({mobile: req.body.mobile})
  const mobile = req.body.mobile
  if(!user){
    res.render('public/forgotPassword', {message:"User not registered"})
  }else{
    client.verify.v2
    .services(verifySid)
      .verifications.create({to:`+91${mobile}`,channel:'sms'})
    .then((verification) => {
      console.log(verification.status)
      req.session.mobile = user.mobile
      res.render('public/forgetPasswordOtp');
    })
  
}


}




const resetPasswordOtpVerify = async (req, res) => {
  try {
    const otp = req.body.otp;
    const mobile = req.session.mobile
    const user = await User.findOne({ mobile: mobile })
    if (!user) {
      res.render('public/forgetPasswordOtp', { message: 'Invalid Session' });
    } else {
      client.verify.v2
        .services(verifySid)
        .verificationChecks.create({ to: `+91${mobile}`, code: otp })
        .then((verification_check) => {
          console.log(verification_check.status);
          if (verification_check.status === "approved") {
            res.render('public/resetPassword')
          } else if (verification_check.status === "denied") {
            res.render('public/forgetPasswordOtp', { message: 'Incorrect OTP' });
          }
        })
    }
  } catch (error) {
    console.log(error)
    res.redirect('/error_500')
  }
}


const setNewPassword = async (req, res) => {
  const newPw = req.body.newPassword
  const confirmPw = req.body.confirmPassword
  const mobile = req.session.mobile
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!passwordRegex.test(req.body.newPassword)) {
    return res.render('public/resetPassword', { message: "Password Should Contain atleast 8 characters,one number and a specialr characte" })
  }
  if (newPw === confirmPw) {
    const sPassword = await securePassword(newPw)
    const newUser = await User.updateOne({ mobile: mobile }, { $set: { password: sPassword } })
    res.redirect('/login')
  } else {
    res.render('public/resetPassword', { message: "Password and Confirm Password is not matching" })
  }
}


const categoryPage = async (req,res,next) =>{
  try{
    const user = res.locals.user;

    const count = await cartHelper.getCartCount(user.id);
    const categoriesToShow = 3; // Define the number of categories to show
        const category = await Category.find({}).limit(categoriesToShow); // Limit the number of categories

    const selectedCategoryId = req.query.id || null;  

    const page = parseInt(req.query.page) || 1; 
    const limit = 8;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || ''; 
    const sortQuery = req.query.sort || 'default'; 
    const minPrice = parseFloat(req.query.minPrice); 
    const maxPrice = parseFloat(req.query.maxPrice)

    const filterCriteria = {
      $and: [
        { isListed: true },
        { isProductListed: true },
        {
          $or: [
            { name: { $regex: new RegExp(searchQuery, 'i') } },
          ]
        }] };
    if (selectedCategoryId) {
      filterCriteria.category = selectedCategoryId;
    }
    

    if (!isNaN(minPrice) && !isNaN(maxPrice)) {
      filterCriteria.$and.push({ price: { $gte: minPrice, $lte: maxPrice } });
    }

    let sortOption = {};
    if (sortQuery === 'price_asc' ||sortQuery === 'default' ) {
      sortOption = { price: 1 }; 
    } else if (sortQuery === 'price_desc') {
      sortOption = { price: -1 }; 
    }

    const totalProducts = await Product.countDocuments(filterCriteria);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filterCriteria)
      .skip(skip) 
       
      .sort(sortOption)
      .populate('category');

      res.render('public/categoryShop',{ product: products,category, currentPage: page, totalPages,  selectedCategoryId, count,sortQuery })
    }
  catch(err){
    console.log('category page error', err);
    next(err);
    }
}

const search= async (req, res,next) => {
  try {
    const user = res.locals.user;

    // const count = await cartHelper.getCartCount(user.id);
    const category = await Category.find({});
    const selectedCategoryId = req.query.id || null;  // This fetches the selected category ID from the query string

    const page = parseInt(req.query.page) || 1; 
    const limit = 30;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || ''; // Get the search query from request query parameters
    const sortQuery = req.query.sort || 'default'; // Get the sort query from request query parameters (default value is 'default')
    const minPrice = parseFloat(req.query.minPrice); // Get the minimum price from request query parameters
    const maxPrice = parseFloat(req.query.maxPrice)

    // Conditionally filter products by category if a category ID is provided
    const filterCriteria = {
      $and: [
        { isListed: true },
        { isProductListed: true },
        {
          $or: [
            { name: { $regex: new RegExp(searchQuery, 'i') } },
          ]
        }] };
    if (selectedCategoryId) {
      filterCriteria.category = selectedCategoryId;
    }

    if (!isNaN(minPrice) && !isNaN(maxPrice)) {
      filterCriteria.$and.push({ price: { $gte: minPrice, $lte: maxPrice } });
    }

    let sortOption = {};
    if (sortQuery === 'price_asc' ||sortQuery === 'default' ) {
      sortOption = { price: 1 }; 
    } else if (sortQuery === 'price_desc') {
      sortOption = { price: -1 }; 
    }

    const totalProducts = await Product.countDocuments(filterCriteria);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(filterCriteria)
      .skip(skip) 
      .limit(limit) 
      .sort(sortOption)
      .populate('category');

    res.render('public/search', { product: products, category, selectedCategoryId, currentPage: page, totalPages,  sortQuery });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};


module.exports = {
  home,
  login,
  signup,
  insertUser,
  verifyLogin,
  userLogout,
  userPage,
  displayproduct,
  verifyotp,
  displayprofile,
  success,
  loadforgetPassword,
  forgotPasswordOtp,
  resetPasswordOtpVerify,
  setNewPassword,
  categoryPage,
  search


};