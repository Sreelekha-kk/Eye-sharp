const Address=require('../models/addressModel')
const Cart=require('../models/cartModel')
const Order=require('../models/orderModel')
const cartHelper=require('../helpers/cartHelper')
const orderHelper=require('../helpers/orderHelper')
const User=require('../models/userModel')
  const { ObjectId } = require("mongodb");
   const Coupon=require('../models/couponModel')
const adminHelper=require('../helpers/addminHelper')
const couponHelper=require('../helpers/couponHelper')
const easyInvoice = require("easyinvoice");
const fs = require('fs')
const { Readable } = require('stream')


const checkOut = async (req, res) => {
    try {
        const user = res.locals.user
        const count = await cartHelper.getCartCount(user.id)
        const coupon = await Coupon.find({});



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
            res.render('public/checkOut', {address: address.addresses, cart, total, count,coupon,walletBalance:user.wallet})
        }else{
            res.render('public/checkOut', {address: [], cart, total, count,coupon,walletBalance:user.wallet})
        }
    } catch (error) {
        console.log(error.message)
    }
}


const postCheckOut = async (req, res, next) => {
  try {
        const userId = res.locals.user._id;
        const data = req.body;

        await couponHelper.addCouponToUser(data.couponCode, userId);
        const checkStock = await orderHelper.checkStock(userId);
        if (!checkStock) {
            await Cart.deleteOne({ user: userId });
            return res.json({ status: 'OrderFailed' });
        }
 
        const userData = await User.findById({ _id: userId })
        const walletAmount = userData.wallet
 
         // If payment option is wallet + razorpay
        if (data.paymentOption === "wallet_razorpay") {
          if (walletAmount >= data.total) {
          console.log("waallet1a")
        // Handle the case when the wallet has enough or more than enough balance
        //     userData.wallet -= data.total; // Deduct the total amount from the wallet
        //     console.log("userData 1a", userData.wallet)
        //     console.log("dataTotal 1a", data.total)
        // await userData.save();

        // const walletTransaction = {
        //     date: new Date(),
        //     type: "Debit",
        //     amount: data.total,
        // }
  
        // await User.updateOne(
        //     { _id: userId },
        //     { $push: { walletTransaction: walletTransaction } }
        // );

        await orderHelper.updateStock(userId);
        await orderHelper.placeOrder(data, userId);
        await Cart.deleteOne({ user: userId });
        return res.json({ orderStatus: true, message: "order placed successfully using wallet" });

    } else {
        // Handle the case when the wallet doesn't have enough balance and the rest will be handled by Razorpay
        console.log("waallet 2a")
        const remainingAmount = data.finalAmount;

        await orderHelper.placeOrder(data, userId);
        const order = await orderHelper.generateRazorpay(userId, remainingAmount);
        return res.json(order);
    }
} else {
            // ... rest of your code
          if (data.paymentOption === "cod" || data.paymentOption === "wallet") {
            await orderHelper.updateStock(userId);
            await orderHelper.placeOrder(data, userId);
            await Cart.deleteOne({ user: userId });

            if (data.paymentOption === "cod") {
                return res.json({ codStatus: true });
            }

            return res.json({ orderStatus: true, message: "order placed successfully" });
          } else if (data.paymentOption === "razorpay") {
            console.log("payment:razor");
              await orderHelper.placeOrder(data, userId);
            const order = await orderHelper.generateRazorpay(userId, data.total);
            console.log(order);
              return res.json(order);
          }
        }
        
    } catch (error) {
        console.error("Error in postCheckOut:", error.message);
        if (error.message === "Insufficient wallet balance!") {
          return res.status(400).json({ error: "Insufficient wallet balance!" });
        }
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

const verifyPayment = (req, res) => {
    console.log("payment");
  const orderId = req.body.order.receipt
    orderHelper.verifyPayment(req.body)
        .then(() => {
    orderHelper.changePaymentStatus(res.locals.user._id, req.body.order.receipt,req.body.payment.razorpay_payment_id)
      .then(() => {
        res.json({ status: true });
      })
      .catch((err) => {
        res.json({ status: false });
      });
  }).catch(async(err)=>{
    console.log(err);
  });
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
const returnOrder = async(req,res)=>{
  const orderId = req.body.orderId
  const status = req.body.status
  const userId = req.body.userId
  adminHelper.returnOrder(orderId,userId,status).then((response) => {
    res.send(response);
  });
}

const downloadInvoice = async (req, res, next) => {
  try {
    const id = req.query.id;
    const userId = res.locals.user._id;
    const result = await orderHelper.findOrder(id, userId);
    const date = result[0].createdAt.toLocaleDateString();
    const product = result[0].productDetails;

    const order = {
      id: id,
      total: parseInt(result[0].totalPrice),
      date: date,
      payment: result[0].paymentMethod,
      name: result[0].shippingAddress.item.name,
      street: result[0].shippingAddress.item.address,
      locality: result[0].shippingAddress.item.locality,
      city: result[0].shippingAddress.item.city,
      state: result[0].shippingAddress.item.state,
      pincode: result[0].shippingAddress.item.pincode,
      product: result[0].productDetails,
      coupon: result[0].couponCode, // Ensure coupon object exists or set it to an empty object
    };
console.log(order);
    let totalQuantity = 0;
    for (const products of product) {
      totalQuantity += products.quantity;
    }

    const discountUsed = parseFloat(result[0].discountAmount) / totalQuantity;

    
    let products = order.product.map((product) => ({
      "quantity": parseInt(product.quantity),
      "description": product.productName,
      "tax-rate": 0,
      "price": parseFloat(product.productPrice - discountUsed),
      // Include coupon code if it exists or an empty string
    }));

    products[products.length]={
      "quantity": " ",
      "description":"coupon:"+order.coupon ,
      "tax-rate": " ",
      "price": parseFloat( discountUsed),
      // Include coupon code if it exists or an empty string
    }
   
    

console.log(order.coupon);

    var data = {
      customize: {},
      images: {
        background: "https://public.easyinvoice.cloud/img/watermark-draft.jpg",
      },
      sender: {
        company: "Eye sharp",
        address: "Brototype",
        zip: "673407",
        city: "Maradu",
        country: "India",

      },
      client: {
        company: order.name,
        address: order.street,
        zip: order.pincode,
        city: order.city,
        country: "India",

      },
      information: {
        number: order.id,
        date: order.date,
        coupon: order.coupon,

        "due-date": "Nil",
        
      },
      
      products: products,
      "bottom-notice": "Thank you, Keep Shopping"
      
      
    }

    easyInvoice.createInvoice(data, async function (result) {
      await fs.writeFileSync("invoice.pdf", result.pdf, "base64");

      res.setHeader('Content-Disposition', 'attachment; filename= "invoice.pdf"');
      res.setHeader('Content-Type', 'application/pdf');

      const pdfStream = new Readable();
      pdfStream.push(Buffer.from(result.pdf, 'base64'));
      pdfStream.push(null);

      pdfStream.pipe(res);
    });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
};



const getSalesReport = async (req, res) => {
  const report = await adminHelper.getSalesReport()
  let details = []
  const getDate = (date) => {
    const orderDate = new Date(date)
    const day = orderDate.getDate()
    const month = orderDate.getMonth() + 1
    const year = orderDate.getFullYear()
    return `${isNaN(day) ? "00" : day} - ${isNaN(month) ? "00" : month} - ${isNaN(year) ? "0000" : year}`
  }
  report.forEach((orders) => {
    details.push(orders.orders)
  })
  res.render('salesReport', {details, getDate})
}
module.exports={
    checkOut,
    postCheckOut,
    orderList,
    orderDetails,
    cancelOrder,
    changeDefaultAddress,
    verifyPayment,
    returnOrder,
    downloadInvoice,
    getSalesReport
    

    
}