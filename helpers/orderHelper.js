const Order = require('../models/orderModel')
const Product = require('../models/productModel')
const Cart = require('../models/cartModel')
const Address = require('../models/addressModel')
const User = require('../models/userModel')
const { ObjectId } = require("mongodb")

require('dotenv').config();

const Razorpay = require('razorpay')

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const checkStock = async (userId) => {
  const products = await Cart.findOne({ user: userId });

  // Check if products is null or undefined
  if (!products) {
    return false; // Handle the case where products is not found
  }

  const cartProducts = products.cartItems;

  for (const cartProduct of cartProducts) {
    const productId = cartProduct.productId;
    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return false; // Handle the case where a product is not found
    }

    if (product.stock < cartProduct.quantity) {
      return false; // Not enough stock for the product
    }
  }

  return true; // All products have sufficient stock
};


const updateStock = async (userId) => {
  try {
    const products = await Cart.findOne({ user: userId });
    if (!products) {
      throw new Error("User's cart not found.");
    }

    const cartProducts = products.cartItems;

    for (const cartProduct of cartProducts) {
      const productId = cartProduct.productId;
      const quantity = cartProduct.quantity;

      const product = await Product.findOne({ _id: productId });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found.`);
      }

      if (product.stock < quantity) {
        return false; // Insufficient stock for this product
      }

      await Product.updateOne(
        { _id: productId },
        { $inc: { stock: -quantity } }
      );
    }

    return true; // All stock updates were successful
  } catch (error) {
    console.error("Error in updateStock:", error.message);
    return false; // An error occurred during the stock update
  }
};




const placeOrder = (data, user) => {
  return new Promise(async (resolve, reject) => {
      try {
          const productDetails = await Cart.aggregate([
            {
                $match: {
                user: user.toString(),
                },
            },
            {
                $unwind: "$cartItems",
            },
            {
                $project: {
                item: "$cartItems.productId",
                quantity: "$cartItems.quantity",
                },
            },
            {
                $lookup: {
                from: "products",
                localField: "item",
                foreignField: "_id",
                as: "productDetails",
                },
            },
            {
                $unwind: "$productDetails",
            },
            {
                $project: {
                productId: "$productDetails._id",
                productName: "$productDetails.name",
                productPrice: "$productDetails.price",
                quantity: "$quantity",
                category: "$productDetails.category",
                image: "$productDetails.images",
                },
            },
          ]);
          const addressData = await Address.aggregate([
              {
                $match: { user: user.toString() },
              },
              {
                $unwind: "$addresses",
              }
              ,
              {
                $match: { "addresses._id": new ObjectId(data.address) },
              },
              {
                $project: { item: "$addresses" },
              },
          ]);

          let status, orderStatus;

          const userData = await User.findById({ _id: user });
          if (data.paymentOption === "wallet_razorpay") {
            if (userData.wallet >= data.total) {
              console.log("wallet 1 b")
              console.log("waallet 1b ", userData.wallet, data.total)
                  // Deduct the total amount from the wallet
                  userData.wallet -= data.total;
                  await userData.save()
                  const walletTransaction = {
                      date: new Date(),
                      type: "Debit",
                      amount: data.total,
                  }

                  await User.updateOne(
                      { _id: user },
                      { $push: { walletTransaction: walletTransaction } }
                  );

                  (status = "Success"), (orderStatus = "Placed");
            } else {
              console.log("waallet 2b")
               console.log("waallet 2b ", userData.wallet, data.total)
                  // Deduct the entire wallet amount
                  const deductedWalletAmount = userData.wallet;
                  userData.wallet = 0;
                  await userData.save()
                  const walletTransaction = {
                      date: new Date(),
                      type: "Debit",
                      amount: deductedWalletAmount,
                  }

                  await User.updateOne(
                      { _id: user },
                      { $push: { walletTransaction: walletTransaction } }
                  );

                  // The remaining amount will be handled by Razorpay
                  (status = "Pending"), (orderStatus = "Pending");
              }
          } else if (data.paymentOption === "cod") {
              (status = "Success"), (orderStatus = "Placed");

          } else if (data.paymentOption === "wallet") {
              if (userData.wallet < data.total) {
                  return reject(new Error("Insufficient wallet balance!"));
              } else {
                  userData.wallet -= data.total;
                  await userData.save();

                  const walletTransaction = {
                      date: new Date(),
                      type: "Debit",
                      amount: data.total,
                  }

                  await User.updateOne(
                      { _id: user },
                      { $push: { walletTransaction: walletTransaction } }
                  );

                  (status = "Success"), (orderStatus = "Placed");
              }

          } else {
            console.log("payment pending");
              // Assuming other options will default to Razorpay
              (status = "Pending"), (orderStatus = "Pending");
          }
          const orderData = {
              _id: new ObjectId(),
              name: addressData[0]?.cartItems?.name || 'Default Name',
              paymentStatus: status,
              paymentMethod: data.paymentOption,
              productDetails: productDetails,
              shippingAddress: addressData[0],
              orderStatus: orderStatus,
              totalPrice: data.total,
              discountPercentage:data.discountPercentage,
              discountAmount:data.discountAmount,
              couponCode:data.couponCode,
              cancelStatus:'false',
              
              createdAt:new Date()
          }

          const order = await Order.findOne({ user: user });
          if (order) {
              await Order.updateOne(
                  { user: user },
                  { $push: { orders: orderData } }
              ).then((response) => {
                  resolve(response);
              });
          } else {
              const newOrder = Order({
                  user: user,
                  orders: orderData,
              });
              await newOrder.save().then((response) => {
                  resolve(response);
              });
          }

      } catch (error) {
          console.log(error.message)
          reject(error); // This will send the error back up to the calling function
      }
  });
}

const cancelOrder = async(orderId,status)=>{
  try {
    return new Promise((resolve, reject) => {
      Order.updateOne(
        { "orders._id": new ObjectId(orderId) },
        {
          $set: { "orders.$.orderStatus": status },
        }
      ).then((response) => {
        resolve(response);
      });
    });
  } catch (error) {
    console.log(error.message);
  }
}



const getOrderList = (page, limit) => {
  return new Promise((resolve, reject) => {
    Order.aggregate([
      { $unwind: "$orders" },
      { $group: { _id: null, count: { $sum: 1 } } },
    ])
      .then((totalOrders) => {
        const count = totalOrders.length > 0 ? totalOrders[0].count : 0;
        const totalPages = Math.ceil(count / limit);
        const skip = (page - 1) * limit;

        Order.aggregate([
          { $unwind: "$orders" },
          { $sort: { "orders.createdAt": -1 } },
          { $skip: skip },
          { $limit: limit },
        ])
          .then((orders) => {
            resolve({ orders, totalPages, page, limit });
          })
          .catch((error) => reject(error));
      })
      .catch((error) => reject(error));
  });
};


const findOrder  = (orderId, userId) => {
  try {
    return new Promise((resolve, reject) => {
      Order.aggregate([
        {
          $match: {
            "orders._id": new ObjectId(orderId),
            user: new ObjectId(userId),
          },
        },
        { $unwind: "$orders" },
      ]).then((response) => {
        let orders = response
          .filter((element) => {
            if (element.orders._id == orderId) {
              return true;
            }
            return false;
          })
          .map((element) => element.orders);

        resolve(orders);
      });
    });
  } catch (error) {
    console.log(error.message);
  }
}

const verifyPayment =  async(details) => {
  try {
    await Order.updateOne({})

    let key_secret = process.env.RAZORPAY_SECRET;
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", key_secret);

      hmac.update(
        details.payment.razorpay_order_id +
          "|" +
          details.payment.razorpay_payment_id
      );
      hmac = hmac.digest("hex");
      if (hmac == details.payment.razorpay_signature) {
        resolve();
      } else {
        console.log('no matchhhhhhhhhhhhh');
        reject("not match");
      }
    });
  } catch (error) {
    console.log(error.message);
  }
}

const changePaymentStatus =  (userId, orderId,razorpayId) => {
  try {
    return new Promise(async (resolve, reject) => {
      await Order.updateOne(
        { "orders._id": new ObjectId(orderId) },
        {
          $set: {
            "orders.$.orderStatus": "Placed",
            "orders.$.paymentStatus": "Success",
            "orders.$.razorpayId": razorpayId
          },
        }
      ),
        await updateStock(userId)
        Cart.deleteMany({ user: userId }).then(() => {
          resolve();
        });
    });
  } catch (error) { 
    console.log(error.message);
  }
}

const changeOrderStatus = (orderId, status) => {
  try {
    return new Promise((resolve, reject) => {
      Order.updateOne(
        { "orders._id": new ObjectId(orderId) },
        {
          $set: { "orders.$.orderStatus": status },
        }
      ).then((response) => {
        resolve({status:true,orderStatus:status});
      });
    });
  } catch (error) {
    console.log(error.message);
  }
}

const generateRazorpay = (userId, total)=> {
  try {
    return new Promise(async (resolve, reject) => {
      let orders = await Order.find({ user: userId });

      let order = orders[0].orders.slice().reverse();
    
      let orderId = order[0]._id;

      var options = {
        amount: total * 100, 
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
          reject(err)
        } else {
          resolve(order);
        }
      });
    });
  } catch (error) { 
    console.log(error.message);
  }
}


module.exports = {
  checkStock,
  updateStock,
  placeOrder,
   cancelOrder,
   
  getOrderList,
  findOrder,
  changeOrderStatus,
  generateRazorpay,
   verifyPayment,
   changePaymentStatus
}