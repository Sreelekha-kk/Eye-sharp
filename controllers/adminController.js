const Admin = require("../models/adminModel")
const User = require("../models/userModel");
const Category=require("../models/categoryModel")
const categoryHelper = require('../helpers/categoryHelper')

const bcrypt = require('bcrypt')
const config = require('../configuration/config')
const orderHelper=require('../helpers/orderHelper')
const Product=require('../models/productModel')
const adminHelper=require('../helpers/addminHelper')
const Order=require('../models/orderModel')

const loadLogin = async(req,res)=>{
    try {
      
        res.render('adminLogin')
    }
     catch (error) {
        console.log(error.message)
    }
}

const adminlogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect('/admin');
  } catch (error) {
    console.log(error.message);
  }
};





const securePassword = async (password) => {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      return passwordHash;
    } catch (error) {
      console.log(error.message);
    }
  };


  const loadDashboard = async (req, res) => {
    try { 
      
      const orders = await Order.aggregate([
        { $unwind: "$orders" },
        { $match: { "orders.orderStatus": "Delivered" } },
        {
          $group: {
            _id: null,
            totalPriceSum: { $sum: { $toInt: "$orders.totalPrice" } },
            count: { $sum: 1}
        }}
      ]) 
  
      const categorySales = await Order.aggregate([
        { $unwind: "$orders" },
        { $unwind: "$orders.productDetails"},
        { $match: { "orders.orderStatus": "Delivered" } },
        {

          $project: {
            CategoryId: "$orders.productDetails.category",
            totalPrice: {
              $multiply: [
                { $toDouble: "$orders.productDetails.productPrice" },
                { $toDouble: "$orders.productDetails.quantity"}
              ]
            }
          }
        },
        {
          $group: {
            _id: "$CategoryId",
            PriceSum: { $sum: "$totalPrice"}
          }
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "categoryDetails"
          }
        },
        { $unwind: "$categoryDetails" },
        {
          $project: {
            categoryName: "$categoryDetails.name",
            PriceSum: 1,
            _id: 0
          }
        }
      ])
  
      const salesData = await Order.aggregate([
        { $unwind: "$orders" },
        {
          $match: {
            "orders.orderStatus": "Delivered"
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$orders.createdAt"
              }
            },
            dailySales: { $sum: { $toInt: "$orders.totalPrice" } }
          }
        },
        { $sort: { _id: 1 } }
      ])
  
      const salesCount = await Order.aggregate([
        { $unwind: "$orders" },
        { $match: { "orders.orderStatus": "Delivered" } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$orders.createdAt"
              }
            },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
  
      const categoryCount = await Category.find({}).count()
      const productsCount = await Product.find({}).count()
  
      const onlinePay = await adminHelper.getOnlineCount()
      // const walletPay = await adminHelper.getWalletCount()
      const codPay = await adminHelper.getCodCount()
  
      const latestOrders = await Order.aggregate([
        { $unwind: "$orders" },
        {
          $sort: {
          'orders.createdAt': -1
          }
        },
        { $limit: 10 }
      ])
  
      res.render('dashboard', {orders, productsCount, categoryCount, salesCount, salesData, categorySales, onlinePay,  codPay, order: latestOrders})
    } catch (error) {
      console.log(error) 
      res.status(500).send('Internal Server Error')
    }
  }
  

const verifyLogin = async(req,res)=>{
    try {
        const email = req.body.email
        const password = req.body.password
        const adminData = await Admin.findOne({email:email})
        if(adminData){
            if(password===adminData.password){
                req.session.admin_id = adminData._id
                return res.redirect('/admin/dashboard')
            }else{
                res.render('adminLogin',{message:"Email and password are incorrect"})
            }
        }else{
            res.render('adminLogin',{message:"Email and password are incorrect"})
        }
    } catch (error) {
        console.log(error.message)
    }
}
const loadUsers = async(req,res)=>{
    try {
  const page = parseInt(req.query.page) || 1; 
  const pageSize = parseInt(req.query.pageSize) || 60; 
  const skip = (page - 1) * pageSize;
  const totalCount = await User.countDocuments({});
  const totalPages = Math.ceil(totalCount / pageSize);
  
  
  
  
      var search = ''
      if(req.query.search){
          search = req.query.search
      }
      const usersData = await User.find({
          $or:[
              {name:{$regex:'.*'+search+'.*'}},
              {email:{$regex:'.*'+search+'.*'}},
              {mobile:{$regex:'.*'+search+'.*'}},
          ]
      }).skip(skip)
      .limit(pageSize)
     
      res.render('usermanagement',{user:usersData,page,
          pageSize,
          totalPages})
  } catch (error) {
      console.log(error.message);
  }
  }
  

  

// const loadHome = async(req, res)=>{
//     try {
//         res.render('dashboard')
//     } catch (error) {
//         console.log(error.message)
//     }
// }

const blockUser = async (req, res) => {
    try {
        console.log("block");
      const id = req.body.userId;
      console.log('Blocking user with ID:', id); // Add this line
      await User.findByIdAndUpdate({ _id: id }, { $set: { is_blocked: true } });
      res.send({ status: true });
    } catch (error) {
      console.log(error);
    }
  };
  

  
  
  const unBlockUser = async(req,res)=>{
    try {
      const id = req.body.userId
      await User.findByIdAndUpdate({_id:id},{$set:{is_blocked:false}})
      res.send({status:true})
    } catch (error) {
      console.log(error.message)
    }
  }


  

  const loadCategory = async(req,res)=>{
    console.log("ifii")
    try {
      const categories = await Category.find();
      
      res.render('categorymanagement',{categories})
    } catch (error) {
        console.log(error)
    }
}

// const createCategory = async(req, res)=>{
//     try {
//        const categoryName = req.body.name.toLowerCase()
//       const existingCategory = await Category.findOne({name:categoryName})

//       if(existingCategory){
//         return res.render("addCategory",{message:"Category already exists"})
//       } 
     
      
//       if (!req.body.name || req.body.name.trim().length === 0) {
//         return res.render("addCategory", { message: "Name is required" });
//     }
//        await categoryHelper.createCategory(req.body)
//       res.redirect('/admin/categorymanagement')
//     } catch (error) {
//       console.log(error.message)
//       res.status(500).json({ error: 'Failed to create category' });
//     }
//   }

const loadAddCategory = async(req, res)=>{
    try {
      
        res.render("addCategory", { message: "Name is required" });
     
    } catch (error) {
      console.log(error.message)
      res.status(500).json({ error: 'Failed to create category' });
    }
  }


  const createCategory = async (req, res) => {
    try {
        const categoryName = req.body.name.toLowerCase();
        const existingCategory = await Category.findOne({ name: categoryName });

        if (existingCategory) {
            return res.render("addCategory", { message: "Category already exists" });
        }

        if (!req.body.name || req.body.name.trim().length === 0) {
            return res.render("addCategory", { message: "Name is required" });
        }

        // Assuming categoryHelper.createCategory returns a Promise
        await categoryHelper.createCategory(req.body);

        // Redirect to the appropriate page after successfully creating the category
        res.redirect('/admin/categorymanagement');
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Failed to create category' });
    }
}





const loadUpdateCategory = async(req,res)=>{
    try {
      
      const id = req.query.id
      const Categorydata = await categoryHelper.loadUpdateCategory(id)
      res.render('updateCategory',{category:Categorydata})
    } catch (error) {
      console.log(error.message)
    }
  }


  async function updateCategory(req, res) {
    try {
      const categoryName = req.body.category.toLowerCase();

      const categoryId  = req.body.id
      const category=await  Category.find({})
      console.log(category);
        const existingCategory = await Category.findOne({ name: categoryName });

        if (existingCategory) {
            return res.render("updateCategory", { category,message: "Category already exists" });
        }

        if (!req.body.category || req.body.category.trim().length === 0) {
            return res.render("updateCategory", { category,message: "Name is required" });
        }

        // Assuming categoryHelper.createCategory returns a Promise
        await categoryHelper.updateCategory(categoryId,req.body);
        console.log("dhhs");
        // Redirect to the appropriate page after successfully creating the category
        res.redirect('/admin/categorymanagement');
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Failed to update category' });
    }
}

  

const orderList = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  orderHelper.getOrderList(page, limit)
    .then(({ orders, totalPages, page: currentPage, limit: itemsPerPage }) => {
      res.render("orderList", {
        orders,
        totalPages,
        page: currentPage,
        limit: itemsPerPage,
      });
    })
    .catch((error) => {
      console.log(error.message);
    });
}

const changeStatus = async(req,res) => {
  const orderId = req.body.orderId
  const status = req.body.status
  orderHelper.changeOrderStatus(orderId, status)
  .then((response) => {
    console.log(response);
    res.json(response);
  });
}
const cancelOrder = async(req,res)=>{
  const userId = req.body.userId
  const orderId = req.body.orderId
  const status = req.body.status
  adminHelper.cancelOrder(orderId,userId,status).then((response) => {
    res.send(response);
  });
}
const orderDetails = async (req,res)=>{
  try {
    const id = req.query.id
    adminHelper.findOrder(id).then((orders) => {
      const address = orders[0].shippingAddress
      const products = orders[0].productDetails 
      res.render('orderDetails',{orders,address,products}) 
    });
  } catch (error) {
    console.log(error.message);
  }
}
const postSalesReport = async (req, res) => {
  let details = []
  const getDate = (date) => {
    const orderDate = new Date(date)
    const day = orderDate.getDate()
    const month = orderDate.getMonth() + 1
    const year = orderDate.getFullYear()
    return `${isNaN(day) ? "00" : day} - ${isNaN(month) ? "00" : month} - ${isNaN(year) ? "0000" : year}`
  }

  adminHelper.postReport(req.body).then((orderDate) => {
    orderDate.forEach((orders) => {
      details.push(orders.orders)
    })
    res.render('salesReport', {details, getDate})
  })
}


module.exports = {
    loadLogin,
    verifyLogin,
    loadDashboard, 
    loadUsers,
    unBlockUser,
    blockUser,
    loadCategory,
    loadAddCategory,
    createCategory,
    loadUpdateCategory,
    updateCategory, 
    adminlogout,
    changeStatus,
    // logout,
    // verifyUser,
    // addUser,
    // readUser,
    // editUser,
    // deleteUser,
    // updateUser,
    // search,
    // manageUser
    orderList,
    cancelOrder,
    orderDetails,
    postSalesReport
}