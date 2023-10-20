const express = require('express')
const adminRoute = express()

const session = require('express-session')
const config = require('../configuration/config')
const multer = require('../multer/multer')



adminRoute.use(session({secret:config.sessionSecret, resave:false, saveUninitialized:false}))

const bodyParser = require('body-parser')
adminRoute.use(bodyParser.json())
adminRoute.use(bodyParser.urlencoded({extended:true}))

adminRoute.set('view engine', 'ejs')
adminRoute.set('views','./views/admin')

const auth = require('../middleware/adminAuth')

const adminController = require('../controllers/adminController')
const productController = require('../controllers/productCondroller')
const categoryController=require('../controllers/categoryController')
const couponController=require('../controllers/couponController')
// adminRoute.get('/', auth.isLogout, adminController.loadLogin)
const bannerController=require('../controllers/bannerController')
const orderController=require('../controllers/orderController')

const orderHelper=require('../helpers/orderHelper')





adminRoute.get('/', adminController.loadLogin)
adminRoute.post('/login',adminController.verifyLogin)
adminRoute.get('/dashboard', auth.isLogin,adminController.loadDashboard)
adminRoute.get('/user', auth.isLogin,adminController.loadUsers)
adminRoute.post('/blockUser', auth.isLogin,adminController.blockUser)
adminRoute.post('/UnblockUser', auth.isLogin,adminController.unBlockUser)



adminRoute.get('/adminlogout',adminController.adminlogout)


adminRoute.get('/categorymanagement',adminController.loadCategory)
// adminRoute.get('/addCategory',adminController.loadAddCategory)
adminRoute.get('/addCategory',adminController.loadAddCategory)
adminRoute.post('/addCategory',adminController.createCategory)
adminRoute.get('/editCategory',adminController.loadUpdateCategory)
adminRoute.post('/editCategory',adminController.updateCategory)
adminRoute.get('/unListCategory', auth.isLogin, categoryController.unListCategory)
adminRoute.get('/reListCategory', auth.isLogin, categoryController.reListCategory)




adminRoute.get('/productmanagement',productController.displayProduct)
adminRoute.get('/product', auth.isLogin, productController.loadProducts)
adminRoute.post('/addProduct', multer.upload, productController.createProduct)
adminRoute.get('/updateProduct', auth.isLogin, productController.loadUpdateProduct)
adminRoute.post('/updateProduct', multer.upload, productController.updateProduct)
adminRoute.get('/unListProduct', productController.unListProduct)
adminRoute.get('/reListProduct', productController.reListProduct)

adminRoute.get('/adminlogout',auth.isLogin,adminController.adminlogout)

// adminRoute.get('*', function(req,res){
//     res.redirect('/admin/')
// })





adminRoute.get('/orderList', auth.isLogin, adminController.orderList)
adminRoute.put('/orderStatus', adminController.changeStatus) 
adminRoute.put('/cancelOrder', adminController.cancelOrder)
adminRoute.get('/orderDetails', auth.isLogin, adminController.orderDetails)
adminRoute.put('/returnOrder',orderController .returnOrder)



adminRoute.get('/couponList',auth.isLogin,couponController.couponList)
adminRoute.get('/addCoupon',auth.isLogin,couponController.loadAddCoupon)
adminRoute.get('/generateCouponCode',auth.isLogin,couponController.generatecouponcode)
adminRoute.post('/addCoupon',auth.isLogin,couponController.addCoupon)
adminRoute.delete('/removeCoupon', auth.isLogin, couponController.removeCoupon)



adminRoute.get('/bannerList',auth.isLogin,bannerController.bannerList)
adminRoute.get('/addBanner',auth.isLogin,bannerController.addBannerQet)
adminRoute.post('/addBanner', multer.addBannerUpload, bannerController.addBannerPost)
adminRoute.get('/deleteBanner', auth.isLogin, bannerController.deleteBanner)
adminRoute.get('/updateBanner',auth.isLogin,bannerController.loaddupdateBanner)
adminRoute.post('/updateBanner', multer.addBannerUpload, auth.isLogin, bannerController.editBanner)


adminRoute.get('/salesReport',auth.isLogin,orderController.getSalesReport)
adminRoute.post('/salesReport',adminController.postSalesReport)



module.exports = adminRoute