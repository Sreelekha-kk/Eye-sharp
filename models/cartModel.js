const mongoose = require("mongoose")
const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.String,
        ref: "User"
    },
    cartItems: [
        {   
            // checked:{type : Boolean, default:false},
            productId: {type: mongoose.Schema.Types.ObjectId, ref: "Product"},
            quantity: {type: Number},
            total: {type: Number},
            images:{type:Array}
        }
    ],
     cartTotal: {
        type: Number
    }
})

module.exports = mongoose.model('Cart', cartSchema)