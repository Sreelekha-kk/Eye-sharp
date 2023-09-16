const Address=require('../models/addressModel')
const Cart=require('../models/cartModel')
const Order=require('../models/orderModel')
const cartHelper=require('../helpers/cartHelper')
const orderHelper=require('../helpers/orderHelper')

//   const { ObjectId } = require("mongodb");
   



const checkOut = async (req, res) => {
    try {
        const user = res.locals.user
        const count = await cartHelper.getCartCount(user.id)

        const total = await Cart.findOne({user: user.id})
        const address = await Address.findOne({user: user._id}).lean().exec()
        const cart = await Cart.aggregate([
            {$match: {user: user.id}},
            {$unwind: "$cartItems"},
            //   {
            //   $match: {
            //     "cartItems.checked": true,
            //   },
            // },
            {$lookup:{
                from: "products",
                localField: "cartItems.productId",
                foreignField: "_id",
                as: "carted"
            }},
            {$project: {
                item: "$cartItems.productId",
                quantity: "$cartItems.quantity",
                total: "$cartItems.total",
                carted: {$arrayElemAt: ["$carted", 0]}
            }}
        ])
        if(address){
            res.render('public/checkOut', {address: address.addresses, cart, total, count})
        }else{
            res.render('public/checkOut', {address: [], cart, total, count})
        }
    } catch (error) {
        console.log(error.message)
    }
}


const postCheckOut = async (req, res) => {
    try {
        console.log("hi sreelekha")
        const userId = res.locals.user._id;
        const data = req.body;

        // await couponHelper.addCouponToUser(data.couponCode, userId);
        const checkStock = await orderHelper.checkStock(userId);

        if (!checkStock) {
            await Cart.deleteOne({ user: userId });
            return res.json({ status: 'OrderFailed' });
        }

        if (data.paymentOption === "cod") {
            await orderHelper.updateStock(userId);
            await orderHelper.placeOrder(data, userId);
            await Cart.deleteOne({ user: userId });

            if (data.paymentOption === "cod") {
                return res.json({ codStatus: true });
            }

            return res.json({ orderStatus: true, message: "order placed successfully" });
        } 
    } catch (error) {
        console.error("Error in postCheckOut:", error.message);
        // if (error.message === "Insufficient wallet balance!") {
        //   return res.status(400).json({ error: "Insufficient wallet balance!" });
        // }
      return res.status(500).json({ error: "An error occurred while processing your request." });
    }
}
const orderList = async (req, res) => {
    try {
        const user = res.locals.user
        const count = await cartHelper.getCartCount(user.id)

        const orders = await Order.aggregate([
            {$match: {user:user._id}},
            {$unwind: "$orders"},
            {$sort: {"orders.createdAt": -1}}
        ])
        res.render('public/profileOrder', {orders, count})
    } catch (error) {
        console.log(error.message)
    }
}




const cancelOrder = async(req,res)=>{
    const orderId = req.body.orderId
    const status = req.body.status
    orderHelper.cancelOrder(orderId, status).then((response) => {
      res.send(response);
    })
}




const changeDefaultAddress = async (req, res) => {
    try {
      const userId = res.locals.user._id
      const result = req.body.addressRadio;
      const user = await Address.find({ user: userId.toString() });
  
      const addressIndex = user[0].addresses.findIndex((address) =>
        address._id.equals(result)
      );
      if (addressIndex === -1) {
        throw new Error("Address not found");
      }
  
      const removedAddress = user[0].addresses.splice(addressIndex, 1)[0];
      user[0].addresses.unshift(removedAddress);
  
      const final = await Address.updateOne(
        { user: userId },
        { $set: { addresses: user[0].addresses } }
      );
  
      res.redirect("/checkout");
    } catch (error) {
      console.log(error.message);
    }
}


const orderDetails = async (req,res)=>{
    try {
      const user = res.locals.user
      const count = await cartHelper.getCartCount(user.id)

      const id = req.query.id
      orderHelper.findOrder(id, user._id).then((orders) => {
        const address = orders[0].shippingAddress
        const products = orders[0].productDetails 
        res.render('public/orderDetails',{orders, address, products, count})
      });      
    } catch (error) {
      console.log(error.message);
    }
  
}



module.exports={
    checkOut,
    postCheckOut,
    orderList,
    orderDetails,
    cancelOrder,
    changeDefaultAddress,
    

    
}