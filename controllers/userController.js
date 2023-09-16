const { name } = require("ejs");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const accountSid = "AC864c7fe9a3d2d021ed48e32d129e9e23";
const authToken = "718e34e69eaa396908817e4da98b7cfc";
const verifySid = "VA416322cca17d99e2751157998a3eaf3c";
const client = require("twilio")(accountSid, authToken);
const Category = require("../models/categoryModel")
const Product = require("../models/productModel")
const cartHelper = require("../helpers/cartHelper")
require("dotenv").config();



const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const home = async (req, res) => {
  try {

    const category = await Category.find({});
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit; // Calculate the number of products to skip

    // Fetch products with pagination
    const totalProducts = await Product.countDocuments({ $and: [{ isListed: true }, { isProductListed: true }] }); // Get the total number of products
    const totalPages = Math.ceil(totalProducts / limit); // Calculate the total number of pages

    // const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
    //   .skip(skip)
    //   .limit(limit)
    //   .populate('category');

    const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
      .limit(limit)
      .populate('category');

    res.render("public/home", { product: products, category, currentPage: page, totalPages });
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

const login = async (req, res) => {
  try {
    console.log("/uc-login");
    res.render("public/login.ejs");
  } catch (error) {
    console.log(error.message);
  }
};

const signup = async (req, res) => {
  try {
    res.render("public/signup.ejs");
  } catch (error) {
    console.log(error.message);
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    const spassword = await securePassword(password);

    const user = new User({
      name: name,
      mobile: mobile,
      email: email,
      password: spassword,

    });
    console.log(user);
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

      res.render("public/verifyOtp", { mobile: mobile });
    }

    else {
      throw new Error("can't save the user data");
    }
  } catch (error) {
    console.log(error.message);
  }

};

const verifyLogin = async (req, res) => {
  try {
    const category = await Category.find({});
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit; // Calculate the number of products to skip

    // Fetch products with pagination
    const totalProducts = await Product.countDocuments({ $and: [{ isListed: true }, { isProductListed: true }] }); // Get the total number of products
    const totalPages = Math.ceil(totalProducts / limit); // Calculate the total number of pages

    // const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
    //   .skip(skip)
    //   .limit(limit)
    //   .populate('category');

    const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
      .limit(limit)
      .populate('category');
    console.log("verified here1");
    const email = req.body.email
    const password = req.body.password

    const userData = await User.findOne({ email: email })
    console.log(userData);
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password)
      if (passwordMatch) {
        if (userData.is_blocked) {
          res.render('public/login', { message: "Your account is blocked" })
          console.log("you are blocked");
        }
        else {
          req.session.user_id = userData._id
          req.session.username = userData.name
          let name = userData.name
          console.log("verified here3", name);
          res.render('public/home', { username: name, product: products, category, currentPage: page, totalPages })
        }
      } else {
        res.render('public/login', { message: "Password is incorrect" })
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
            res.redirect('/');
          } else if (verification_check.status === "denied") {
            res.render('public/verifyOtp', { message: 'Incorrect OTP' });
          }
        })

    }

  } catch (error) {
    console.log(error.message)
  }
}

const userLogout = async (req, res) => {
  try {
    req.session.destroy()
    res.redirect('/login')
  } catch (error) {
    console.log(error.message)
  }
}
const displayproduct = async (req, res) => {
  try {
    const category = await Category.find({});
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit; // Calculate the number of products to skip

    // Fetch products with pagination
    const totalProducts = await Product.countDocuments({ $and: [{ isListed: true }, { isProductListed: true }] }); // Get the total number of products
    const totalPages = Math.ceil(totalProducts / limit); // Calculate the total number of pages

    // const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
    //   .skip(skip)
    //   .limit(limit)
    //   .populate('category');

    const products = await Product.find({ $and: [{ isListed: true }, { isProductListed: true }] })
      .limit(limit)
      .populate('category');

    res.render("public/shop", { product: products, category, currentPage: page, totalPages });
  } catch (error) {
    console.log(error.message);
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


const forgotPasswordOtp = async (req, res) => {
  const user = await User.findOne({ mobile: req.body.mobile })
  const mobile = req.body.mobile
  if (!user) {
    res.render('public/forgetPassword', { message: "User not registered" })
  } else {
    client.verify.v2
      .services(verifySid)
      .verifications.create({ to: `+91${mobile}`, channel: 'sms' })
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
  setNewPassword


};