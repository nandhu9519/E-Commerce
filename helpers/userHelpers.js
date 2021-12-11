var db = require("../config/connections");
var collection = require("../config/collections");
var bcrypt = require("bcrypt");
var objectId = require("mongodb").ObjectId;
const { response } = require("express");
const collections = require("../config/collections");
const { ObjectId } = require("bson");
const Razorpay = require("razorpay");
var session = require("express-session");
const { resolve } = require("path");
const { resolveCaa } = require("dns");
const { COUPEN_COLLECTION } = require("../config/collections");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const ACCESS_KEY = process.env.CONVERTER_ACCESS_KEY;
var paypal = require('paypal-rest-sdk');
paypal.configure({

  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.payPalClient_id,
  'client_secret': process.env.payPalClient_secret

});

var instance = new Razorpay({
  key_id: process.env.razorPayKey_id,
  key_secret: process.env.razorPayKey_secret,
});

module.exports = {
  signUpValidation:(signUpInfo)=>{
    return new Promise(async (resolve, reject) => {
      let userCred = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: signUpInfo.email });
        if(userCred){
          resolve({status:true})
        }else
        {
          resolve({status:false})
        }
    })
  },

  Signup: (signupData) => {
    return new Promise(async (resolve, reject) => {
        signupData.password = await bcrypt.hash(signupData.password, 10);
        db.get()
          .collection(collection.USER_COLLECTION)
          .insertOne({
            user: signupData.user,
            email: signupData.email,
            password: signupData.password,
            contact: "91" + signupData.contact,
            status: false,
          })
          .then(() => {
            resolve({status:true});
          });
    });
  },
  doLogin: (signupData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: signupData.email });

      if (user == null) {
        console.log("not in server data");
        resolve({ status: false });
      } else if (user.status == false) {
        bcrypt.compare(signupData.password, user.password).then((status) => {
          if (status) {
            response.name = user.name;
            response.status = true;
            response._id = ObjectId(user._id);
            resolve(response);
          } else {
            console.log("login failed");
            resolve({ status: false });
            console.log(status);
          }
        });
      } else if (user.status == true) {
        response.status = "blocked";
        resolve(response);
        console.log("stahere", response);
      }
    });
  },

  forgotPassword: (body,contact) => {
    return new Promise(async (resolve, reject) => {
      console.log("contact", contact);
      console.log("password", body.password);
      newContact='91'+contact
      let newPassword = await bcrypt.hash(body.password, 10);
      // password = userData.password;
      var data = await db
        .get()
        .collection(collections.USER_COLLECTION)
        .updateOne({ contact:newContact }, { $set: {password:newPassword } });
      resolve(data);
      console.log("data", data);
    });
  },
  verifyContact: (body) => {
    return new Promise(async (resolve, reject) => {
      console.log("contact", body.contact);
      contactNo = "91" + body.contact;
      console.log("contact", contactNo);
      let contactExist = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ contact: contactNo });
      console.log(contactExist);
      if (contactExist) {
        let userInfo = {
          info: contactExist._id,
          status: true,
        };
        resolve(userInfo);
      } else {
        console.log("false");
        let userInfo = {
          status: false,
        };
        resolve(userInfo);
      }
    });
  },

  addToCart: (userId, productId, price) => {
    return new Promise(async (resolve, reject) => {
      let prod = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(productId) });
      let prodObj = {
        item: ObjectId(productId),
        orderId: objectId(userId),
        prodName: prod.name,
        quantity: 1,
        price: parseInt(price),
        totalPrice: parseInt(price),
        status: "PLACED",
      };

      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      if (userCart) {
        let prodExist = userCart.products.findIndex(
          (product) => product.item == productId
        );
        if (prodExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(productId) },
              { $inc: { "products.$.quantity": 1 } }
            )
            .then(() => {
              resolve();
            });
        } else {
          await db
            .get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: ObjectId(userId) },
              { $push: { products: prodObj } }
            )
            .then(() => {
              resolve();
            });
        }
      } else {
        let userCart = {
          user: objectId(userId),
          products: [prodObj],
        };
        await db
          .get()
          .collection(collection.CART_COLLECTION)
          .insertOne(userCart)
          .then((response) => {
            resolve();
          });
      }
    });
  },

  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              totalPrice: "$products.totalPrice",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              totalPrice: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      if (cartItems.length != 0) {
        resolve(cartItems);
      } else {
        resolve(false);
      }
    });
  },

  getUserOrders: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(orderId) })
        .toArray();

      resolve(orders);
    });
  },

  getProdsInOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let prodInOrder = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },

          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
              price: "$products.price",
              total: "$products.totalPrice",
              status: "$products.status",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              price: 1,
              total: 1,
              status: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(prodInOrder);
    });
  },

  cartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        count = userCart.products.length;
      }
      resolve(count);
    });
  },

  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);
    details.price = parseInt(details.price);
    // console.log(details);
    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ status:false });
          });
      }
      else{
          db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: {
                "products.$.quantity": details.count,
                "products.$.totalPrice": details.price * details.count,
              },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
        }
     });
  },

  removeCartProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },

  totalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.price"] } },
            },
          },
        ])
        .toArray();
      if (total.length != 0) {
        resolve(total[0].total);
      } else {
        resolve(false);
      }
    });
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.products);
    });
  },

  placeOrder: (body, products, total) => {
    return new Promise(async (resolve, reject) => {
      console.log('COUPONNAME',body.couponName);
      let orderObj = {
        deliveryDetails: {
          name: body.fname,
          address: body.address,
          city: body.city,
          state: body.state,
          contact: body.contact,
        },
        userId: objectId(body.userId),
        paymentMode: body.paymentMode,
        products: products,
        totalAmount: parseInt(total),
        date: new Date().toLocaleString("en-US").slice(0, 9),
        time: new Date().toLocaleString("en-US").slice(11, 23),
        mode: "cart",
        couponCode: body.couponName
        };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(body.userId) });
          resolve(response.insertedId);
        });
    });
  },

  getOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orderList = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ userId: objectId(userId) });
      resolve(orderList);
    });
  },
  generateRazorPay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: parseInt(total * 100),
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        resolve(order);
      });
    });
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      let hmac = crypto.createHmac("sha256", "LM8LzwBewWeCc2I7dpfvHXwN");
      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },

  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          { $set: { status: "PLACED" } }
        )
        .then(() => {
          resolve();
        });
    });
  },

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      data = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(data);
    });
  },

  blockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      let status = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: objectId(userId) }, { $set: { status: true } });
      resolve(status);
    });
  },

  unBlockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      let status = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ _id: objectId(userId) }, { $set: { status: false } });
      resolve(status);
    });
  },

  getAllUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(orders);
    });
  },

  profileUpdate: (userId, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              user: data.first_name,
              email: data.email,
              lastName: data.last_name
            },
          }
        )
        .then((data) => resolve(data));
    });
  },

  addAddress: (userData, user_Id) => {
    let addressDetails = {
      addressId: uuidv4(),
      firstname: userData.firstName,
      lastname: userData.lastName,
      addressline1: userData.addressLine1,
      addressLine2: userData.addressLine2,
      city: userData.city,
      state: userData.state,
      pincode: userData.pincode,
      contact: userData.contact,
    };
    return new Promise(async (resolve, reject) => {
      let userAddress = await db
        .get()
        .collection(collection.ADDRESS_COLLECTION)
        .findOne({ userId: objectId(user_Id) })
        
      if(userAddress){
        length=userAddress.address.length
        console.log('lenght',length);
          if (length >= 3) {
            resolve({status:false})
          }
         else {
          db.get()
          .collection(collection.ADDRESS_COLLECTION)
          .updateOne(
            { userId: objectId(user_Id) },
            { $push: { address: addressDetails } }
          )
          .then(() => {
            console.log('true');
            resolve({status:true});
          })
          
        }
      }else{
        let address = {
          userId: objectId(user_Id),
          address: [addressDetails],
        };
        db.get()
          .collection(collection.ADDRESS_COLLECTION)
          .insertOne(address)
          .then(() => {
            console.log('true2');
            resolve({status:true});
          }); 
      }
    });
  },
  getEditAddress:(userId,addressId)=>{
   return new Promise(async(resolve,reject)=>{
     editAddress= await db.get().collection(collection.ADDRESS_COLLECTION).aggregate([
       {
         $match:{userId:objectId(userId)}
       },
       {
         $unwind:'$address'
       },
       {
         $project:{
           addressId:"$address.addressId",
           fname:"$address.firstname",
           lname:"$address.lastname",
           line1:"$address.addressline1",
           line2:"$address.addressLine2",
           city:"$address.city",
           state:"$address.state",
           pincode:"$address.pincode",
           contact:"$address.contact"
         }
       },
       {
         $match:{addressId:addressId}
       }
     ]).toArray()
     resolve(editAddress[0])
   })
  },
  editAddressSubmit:(userId,addId,userData)=>{
    return new Promise((resolve,reject)=>{
     
      db.get().collection(collection.ADDRESS_COLLECTION).updateOne({userId:objectId(userId),address:{$elemMatch:{addressId:addId}}},
      {$set:
        {
        'address.$.addressId': addId,
        'address.$.firstname': userData.firstName,
        'address.$.lastname': userData.lastName,
        'address.$.addressline1': userData.addressLine1,
        'address.$.addressLine2': userData.addressLine2,
        'address.$.city': userData.city,
        'address.$.state': userData.state,
        'address.$.pincode': userData.pincode,
        'address.$.contact': userData.contact
      }
    }).then((data)=>{
        console.log('data',data)
        resolve()
      })
    })
  },

  profileData: (userId) => {
    return new Promise(async (resolve, reject) => {
      userdata = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) });
      resolve(userdata);
    });
  },

  buynow: (prodId) => {
    return new Promise(async (resolve, reject) => {
      prod = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) });
      resolve(prod);
    });
  },

  getUserOrdersAdmin: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ _id: objectId(orderId) })
        .toArray();
      resolve(orders[0]);
    });
  },

  buyNowProduct: (prodId) => {
    return new Promise(async (resolve, reject) => {
      let singleProd = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) });
      resolve(singleProd);
    });
  },

  buyNowPlaceOrder: (body, userId, product) => {
    return new Promise(async (resolve, reject) => {
        // let status = body.paymentMode == "COD" ? "PLACED" : "PENDING";
      if (body.hidden) {
        var orderObj = {
          deliveryDetails: {
            name: body.fname,
            address: body.address,
            city: body.city,
            state: body.state,
            contact: body.contact,
          },
          userId: objectId(userId),
          prodId: objectId(product._id),
          products: product.name,
          paymentMode: body.paymentMode,
          totalAmount: body.hidden,
          quantity: 1,
          date: new Date().toLocaleString("en-US").slice(0, 9),
          time: new Date().toLocaleString("en-US").slice(10, 23),
          status: "PLACED",
          mode: "buynow",
          couponCode: body.couponName,
        };
      } else {
        var orderObj = {
          deliveryDetails: {
            name: body.fname,
            address: body.address,
            city: body.city,
            state: body.state,
            contact: body.contact,
          },
          userId: objectId(userId),
          prodId: objectId(product._id),
          products: product.name,
          paymentMode: body.paymentMode,
          totalAmount: product.price,
          quantity: 1,
          date: new Date().toLocaleString("en-US").slice(0, 10),
          time: new Date().toLocaleString("en-US").slice(10, 23),
          status: "PLACED",
          mode: "buynow",
        };
      }
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then(() => {
          resolve();
        });
    })
  },
  razorpayBuyNowPlaceOrder:(body, product,userId )=>{
    return new Promise((resolve,reject)=>{
    console.log('bodyhere',product);
    if (body.hidden) {
      var orderObj = {
        deliveryDetails: {
          name: body.fname,
          address: body.address,
          city: body.city,
          state: body.state,
          contact: body.contact,
        },
        userId: objectId(userId),
        prodId: objectId(product._id),
        products: product.name,
        paymentMode: body.paymentMode,
        totalAmount: body.hidden,
        quantity: 1,
        date: new Date().toLocaleString("en-US").slice(0, 9),
        time: new Date().toLocaleString("en-US").slice(11, 23),
        status: "PLACED",
        mode: "buynow",
        couponCode: body.couponName,
      };
    } else {
      var orderObj = {
        deliveryDetails: {
          name: body.fname,
          address: body.address,
          city: body.city,
          state: body.state,
          contact: body.contact,
        },
        userId: objectId(userId),
        prodId: objectId(product._id),
        products: product.name,
        paymentMode: body.paymentMode,
        totalAmount: product.price,
        quantity: 1,
        date: new Date().toLocaleString("en-US").slice(0, 10),
        time: new Date().toLocaleString("en-US").slice(12, 23),
        status: "PLACED",
        mode: "buynow",
      };
    }
    db.get()
      .collection(collection.ORDER_COLLECTION)
      .insertOne(orderObj)
      .then(() => {
        resolve();
      });
  })
  },
  generatePaypal: (orderId, totalPrice) => {
    console.log('addaffddfafdfd',orderId,totalPrice);
    return new Promise(async (resolve, reject) => {
      
        var create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": 'http://localhost:8000/test',
                "cancel_url": "http://cancel.url"
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": orderId,
                        "sku": "item",
                        "price": parseFloat(totalPrice).toFixed(2),
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": parseFloat(totalPrice).toFixed(2),
                },
                "description": "The Payement success"
            }]
        };
        paypal.payment.create(create_payment_json, function (error, payment) {
            if (error) {
              console.log("The error is : ",error)
                reject(false);

            } else {

                resolve(true)
            }
        });
    })
},
  getUserAddress: (user_Id) => {
    return new Promise(async (resolve, reject) => {
      let userAddress = await db
        .get()
        .collection(collection.ADDRESS_COLLECTION)
        .findOne({ userId: objectId(user_Id) });
      if (userAddress) {
        resolve(userAddress.address);
      } else {
        resolve();
      }
    });
  },
  paymentModeCheck: (orderId) => {
    return new Promise((resolve, reject) => {
      data = db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectId(orderId) });
      resolve(data);
    });
  },

  buyNowViewOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let productDetail = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(orderId) });
      resolve(productDetail);
    });
  },

  cancelBuyNowProduct: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderDetails = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ _id: objectId(orderId) });
      await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(orderDetails.prodId) },
          { $inc: { stock: 1 } }
        );
      await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          { $set: { status: "CANCELLED" } }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },

  cancelCartProduct: (orderId, prodId, qty) => {
    return new Promise((resolve, reject) => {
      quantity = parseInt(qty);
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne({ _id: objectId(prodId) }, { $inc: { stock: quantity } });
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          {
            _id: objectId(orderId),
            products: { $elemMatch: { item: objectId(prodId) } },
          },
          { $set: { "products.$.status": "CANCELLED" } }
        )
        .then((response) => {
          console.log(response);
          resolve(response);
        });
    });
  },

  cartStockUpdate: (products) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(products.item) },
          { $inc: { stock: -products.quantity } }
        )
        .then((data) => {
          console.log("cartstcok", data);
          resolve();
        });
        
    });
  },

  addCoupon: (data) => {
    return new Promise(async(resolve, reject) => {
      console.log('vbnm',data);
      let status
      let couponExist=await db.get().collection(collection.COUPEN_COLLECTION).findOne({couponCode:data.couponCode})
      if(couponExist)
      { 
        status=false
        resolve(status)
      }else{
        let obj = {
          couponCode: data.couponCode,
          discount: data.discount,
          expiry: new Date(data.date).getTime()
        };
        db.get()
          .collection(collection.COUPEN_COLLECTION)
          .insertOne(obj)
          .then((response) => {
            status=true
            resolve(status);
          });
      }
    });
  },

  showAllCoupon: () => {
    return new Promise(async (resolve, reject) => {
      let coupons = await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .find()
        .toArray();
      resolve(coupons);
      console.log(coupons);
    });
  },

  deleteCoupon: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPEN_COLLECTION)
        .deleteOne({ _id: objectId(id) })
        .then(() => {
          resolve();
        });
    });
  },

  couponElgibility: (code, price, userId) => {
    return new Promise(async (resolve, reject) => {
      console.log('USERID',userId,'CODE',code);
      couponStatus = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .findOne({ userId: objectId(userId), couponCode: code });
      couponInfo = await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .findOne({ couponCode: code });
       console.log('couponstatus',couponStatus);
      if (couponStatus) {
        let obj1 = {
          status: false,
        };
        resolve(obj1);
      } else if (couponInfo == null) {
        console.log("enter");
        let obj3 = {
          status: "invalid",
        };
        resolve(obj3);
      } else {
        let discountprice = (couponInfo.discount / 100) * price;
        let finalPrice = price - discountprice;

        let obj = {
          coupon: code,
          finalPrice: finalPrice,
          discountprice: discountprice,
          status: true,
        };
        resolve(obj);
      }
    });
  },

  deleteAddress: (addId, userId) => {
    console.log("add", addId, "user", userId);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ADDRESS_COLLECTION)
        .updateOne(
          { userId: objectId(userId) },
          { $pull: { address: { addressId: addId } } },
          { multi: true }
        )
        .then((response) => {
          console.log("The response : ", response);
          resolve(response);
        });
    });
  },
  findSearch :(key)=>{
    return new Promise(async(resolve,reject)=>{
        var result = await db.get().collection(collection.PRODUCT_COLLECTION).find({ name: { $regex: key, $options: "$i" } }).toArray()
        console.log('hi helo',result)
        resolve(result)     
    })
},

  convertAmount: (amount) => {
    return new Promise(async (resolve, reject) => {
      amount = parseInt(amount);
      axios
        .get(
          `http://apilayer.net/api/live?access_key=${ACCESS_KEY}&currencies=INR`
        )
        .then((response) => {
          amount = amount / response.data.quotes.USDINR;
          resolve(amount);
        });
    });
  },
  addToWishList: (prodId, id) => {
    return new Promise(async (resolve, reject) => {
      let productDetails = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) });
      console.log("id", id);
      let listExist = await db
        .get()
        .collection(collection.WISH_LIST)
        .findOne({ userId: id });
      let prodInfo = {
        prodId: prodId,
        prodName: productDetails.name,
        prodPrice: productDetails.price,
      };
      if (listExist) {
        await db
          .get()
          .collection(collection.WISH_LIST)
          .updateOne({ userId: id }, { $push: { productInfo: prodInfo } })
          .then((response) => {
            resolve(response);
          });
      } else {
        let user_products = {
          userId: id,
          productInfo: [prodInfo],
        };
        await db
          .get()
          .collection(collection.WISH_LIST)
          .insertOne(user_products)
          .then((response) => {
            resolve(response);
          });
      }
    });
  },
  getWishList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishList = await db
        .get()
        .collection(collection.WISH_LIST)
        .findOne({ userId: userId });
      resolve(wishList);
    });
  },
  addToWishListCart: (userId, prodId) => {
    return new Promise(async (resolve, reject) => {
      let prod = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) });
      let prodObj = {
        item: ObjectId(prodId),
        orderId: objectId(userId),
        prodName: prod.name,
        quantity: 1,
        price: parseInt(prod.price),
        totalPrice: parseInt(prod.price),
        status: "PLACED",
      };
        
        let userCart = {
          user: objectId(userId),
          products: [prodObj],
        };

        let userCartExist=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
        if(userCartExist){
          await db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},{$push:{products:prodObj}})
        }else
        {
          await db
          .get()
          .collection(collection.CART_COLLECTION)
          .insertOne(userCart)
        }

         await db.get()
        .collection(collection.WISH_LIST)
        .updateOne(
          { userId: userId },
          { $pull: { productInfo: { prodId: prodId } } }
        )
        wishList=await db.get().collection(collection.WISH_LIST).findOne({userId:userId})
        if(wishList.productInfo.length==0)
        {        
          await db.get().collection(collection.WISH_LIST).deleteOne({userId: userId}).then((response) => {
            resolve({status:true});
          });
        }else
        {
          resolve(response)
        }
  
    });
  },

  removeFromWishList: (prodId, userId) => {
    return new Promise(async(resolve, reject) => {
      console.log("removefromwishlist");
      await db.get()
        .collection(collection.WISH_LIST)
        .updateOne(
          { userId: userId },
          { $pull: { productInfo: { prodId: prodId } } }
        )
        wishList=await db.get().collection(collection.WISH_LIST).findOne({ userId: userId })
        if(wishList.productInfo.length==0)
        {
          await db.get().collection(collection.WISH_LIST).deleteOne({userId: userId})
        }
        resolve({status:true})
      });
  },
  wihslistCount:(userId)=>{
    return new Promise(async(resolve,reject)=>{
      let wishlist=await db.get().collection(collection.WISH_LIST).findOne({userId: userId})
      wishlistCount=0
      if(wishlist)
      {
      console.log(wishlist);
      wishlistCount=wishlist.productInfo.length
      }
      resolve(wishlistCount)
      
    })
  },
  verifyPassword:(userId,password)=>{
    return new Promise(async (resolve,reject)=>{
      console.log(userId,'  user',password.currentPassword,'pass');
      userInfo= await db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)})
      console.log(userInfo);

      await  bcrypt.compare(password.currentPassword,userInfo.password).then((result)=>{
        if(result)
        {  
          resolve({status:true})
        }else{
          console.log('false',result);
          resolve({status:false})
        }
      })
    })
  },
  //update user password from profile
  updatePassword:(userId,data)=>{
    return new Promise(async(resolve,reject)=>{
      console.log('qwertyuio',userId,data);
      newPass=await bcrypt.hash(data.newPass,10)
      await db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{$set:{password:newPass}}).then((response)=>{
        resolve(response)
      })
    })
  }
};
