const Coupon=require('../models/couponModel')
const couponHelper=('../helpers/couponHelper.js')


const couponList = async (req, res) => {
    try {
        const couponList = await Coupon.find()
        res.render('couponList', {couponList})
    } catch (error) {
        console.log(error.message)
    }
}


const loadAddCoupon = async (req, res) => {
    try {
        res.render('addcoupon')
    } catch (error) {
        console.log(error.message)
    }
}





module.exports={
    couponList,
    loadAddCoupon
}