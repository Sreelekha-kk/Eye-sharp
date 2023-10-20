const express = require('express')
const userRoute = express.Router()

const auth = require('../middleware/auth')

 userRoute.use(auth.checkSession)


  const profileController = require('../controllers/profileCondroller')

// const cartController = require('../controllers/cartController')

 
const productController = require('../controllers/productCondroller')
 
const orderController=require('../controllers/orderController')
const userController = require('../controllers/userController')
const cartController = require('../controllers/cartController')
const couponController=require('../controllers/couponController')
userRoute.get('/login',userController.login)

userRoute.get('/',userController.home)
userRoute.get('/home',userController.home)

userRoute.get('/signup',userController.signup)
userRoute.post('/signupValidate',userController.insertUser)
userRoute.post('/loginValidate', userController.verifyLogin)
//  userRoute.post('/signupvalidate',userController.verifyOtp)
userRoute.post('/verifyOtp', userController.verifyotp)
userRoute.get('/logout',userController.userLogout)
userRoute.get('/userPage',userController.userPage)


userRoute.get('/shop',userController.displayproduct)


userRoute.get('/productPage', auth.isLogin, productController.productPage)
userRoute.get('/categoryShop', auth.isLogin, userController.categoryPage)


userRoute.get('/cart', auth.isLogin, auth.blocked, cartController.loadCart)
userRoute.post('/addToCart/:id', auth.isLogin, auth.cartBlocked, cartController.addToCart)
userRoute.put('/change-product-quantity',auth.isLogin,cartController.updateQuantity)
userRoute.delete('/delete-product-cart',auth.isLogin,cartController.deleteProduct)



userRoute.get('/forgotPassword',userController.loadforgetPassword)
userRoute.post('/forgotPasswordOtp',userController.forgotPasswordOtp)
userRoute.post('/forgotPassword', userController.resetPasswordOtpVerify)
userRoute.post('/setNewPassword',userController.setNewPassword)







userRoute.get('/profile',userController.displayprofile)
userRoute.get('/profileAddress',profileController.profileAddress)
userRoute.post('/submitAddress', profileController.submitAddress)
userRoute.post('/updateAddress',profileController.editAddress)
userRoute.get('/deleteAddress',profileController. deleteAddress)
userRoute.get('/wallet',profileController.walletTransaction)


userRoute.get('/checkOut',auth.isLogin,auth.blocked,orderController.checkOut)
userRoute.post('/checkOutAddress', auth.isLogin, profileController.checkOutAddress)

userRoute.post('/checkOut', auth.isLogin, auth.cartBlocked, orderController.postCheckOut)
userRoute.get('/success',userController.success)
userRoute.get('/profileOrderList', auth.isLogin, auth.blocked, orderController.orderList)
userRoute.post('/changeDefaultAddress',auth.isLogin,orderController.changeDefaultAddress)
  //  userRoute.get('/orderDetails', auth.isLogin, auth.blocked, orderController.orderDetails)
  userRoute.get('/orderDetails', auth.isLogin, auth.blocked, orderController.orderDetails)
  // userRoute.post('/changeDefaultAddress', auth.isLogin, orderController.changePrimary)
  userRoute.get('/invoice',orderController.downloadInvoice)

  



  userRoute.put('/cancelOrder', auth.isLogin, orderController.cancelOrder)
  
  
  userRoute.post('/verifyPayment', orderController.verifyPayment)  
  // userRoute.post('/paymentFailed', orderController.paymentFailed)

userRoute.get('/applyCoupon/:id', auth.isLogin, auth.blocked, couponController.applyCoupon)
userRoute.get('/verifyCoupon/:id', auth.isLogin, auth.blocked, couponController.verifyCoupon)


 userRoute.get('/search',userController.search)


module.exports = userRoute

