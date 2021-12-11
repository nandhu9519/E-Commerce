var db = require("../config/connections");
var collection = require("../config/collections");
var objectId = require("mongodb").ObjectId;
const { response } = require("express");
const collections = require("../config/collections");
const { PRODUCT_COLLECTION } = require("../config/collections");

module.exports = {
  addProduct: (product) => {
    return new Promise(async (resolve, reject) => {
      product.price = parseInt(product.price);
      product.stock = parseInt(product.stock);
      product.date = new Date().toLocaleString("en-US").slice(0, 10);

      const data = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .insertOne(product);
      resolve(data);
    });
  },

  allProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .sort({ _id: -1 })
        .toArray();
      resolve(products);
    });
  },
  deleteProduct: (prodId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .deleteOne({ _id: objectId(prodId) })
        .then((user) => {
          resolve(user);
        });
    });
  },
  getProduct: (prodId) => {
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) })
        .then((data) => {
          resolve(data);
        });
    });
  },

  editProduct: (prodId, prodInfo) => {
    return new Promise(async (resolve, reject) => {
      console.log("asd", objectId(prodId));
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(prodId) },
          {
            $set: {
              name: prodInfo.name,
              price: parseInt(prodInfo.price),
              description: prodInfo.description,
              category: prodInfo.category,
              expire_date: prodInfo.expire_date,
              stock: parseInt(prodInfo.stock),
              brand: prodInfo.brand,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },

  singleView: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(prodId) })
        .then((data) => {
          resolve(data);
        });
    });
  },

  addCategory: (data) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .insertOne(data)
        .then((response) => {
          resolve(response.insertedId);
          console.log("id", response.insertedId);
        });
    });
  },
  addBrand: (data) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.BRAND_COLLECTION)
        .insertOne(data)
        .then((response) => {
          resolve(response.insertedId);
          console.log("id", response.insertedId);
        });
    });
  },

  updateProductStatus: (orderId, prodId, update, ordermethod) => {
    return new Promise((resolve, reject) => {
      if (ordermethod == "cart") {
        db.get()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
            {
              _id: objectId(orderId),
              products: { $elemMatch: { item: objectId(prodId) } },
            },
            { $set: { "products.$.status": update } }
          )
          .then((response) => {
            console.log(response);
            resolve(response);
          });
      } else if (ordermethod == "buynow") {
        db.get()
          .collection(collection.ORDER_COLLECTION)
          .updateOne({ _id: objectId(orderId) }, { $set: { status: update } })
          .then((response) => {
            resolve(response);
          });
      }
    });
  },

  buyNowStockUpdate: (prodId) => {
    return new Promise((resolve,reject)=>{
      db.get()
      .collection(collection.PRODUCT_COLLECTION)
      .updateOne({ _id: objectId(prodId) }, { $inc: { stock: -1 } })
      .then((data) => {
        resolve(data);
      });
    })
  },

  orderCount: () => {
    return new Promise(async (resolve, reject) => {
      var buyNowCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ mode: "buynow" })
        .count();

      var cartProdCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "cart" },
          },
          {
            $unwind: "$products",
          },
        ])
        .toArray();
      cartProdCount = cartProdCount.length;
      totalOrderCount = buyNowCount + cartProdCount;

      resolve(totalOrderCount);
    });
  },
  shippedCount: () => {
    return new Promise(async (resolve, reject) => {
      var buyNowShippedCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ mode: "buynow", status: "SHIPPED" })
        .count();
      var cartShippedCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "cart" },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              status: "$products.status",
            },
          },
          {
            $match: { status: "SHIPPED" },
          },
        ])
        .toArray();
      cartShippedCount = cartShippedCount.length;
      totalShippedCount = cartShippedCount + buyNowShippedCount;
      resolve(totalShippedCount);
    });
  },
  cancelledCount: () => {
    return new Promise(async (resolve, reject) => {
      var buyNowCancelledCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ mode: "buynow", status: "CANCELLED" })
        .count();

      var cartCancelledCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "cart" },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              status: "$products.status",
            },
          },
          {
            $match: { status: "CANCELLED" },
          },
        ])
        .toArray();
      cartCancelledCount = cartCancelledCount.length;
      totalCancelledCount = cartCancelledCount + buyNowCancelledCount;
      resolve(totalCancelledCount);
    });
  },

  deliveredCount: () => {
    return new Promise(async (resolve, reject) => {
      var buyNowDeliverdCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ mode: "buynow", status: "DELIVERED" })
        .count();
      console.log("cancel", buyNowDeliverdCount);
      var cartDeliverdCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "cart" },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              status: "$products.status",
            },
          },
          {
            $match: { status: "DELIVERED" },
          },
        ])
        .toArray();
      cartDeliverdCount = cartDeliverdCount.length;
      totalDeliverdCount = cartDeliverdCount + buyNowDeliverdCount;
      resolve(totalDeliverdCount);
    });
  },
  getAllOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let buynowPlaced = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId), status: "PLACED" })
        .toArray();
      let buynowShipped = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId), status: "SHIPPED" })
        .toArray();
      let buynowDelivered = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId), status: "DELIVERED" })
        .toArray();
      let buynowCancelled = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId), status: "CANCELLED" })
        .toArray();

      let cartPlaced = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              prodId: "$products.item",
              products: "$products.prodName",
              quantity: "$products.quantity",
              totalAmount: "$products.totalPrice",
              status: "$products.status",
              paymentMode: "$paymentMode",
              date: "$date",
              time: "$time",
              mode: "$mode",
            },
          },
          {
            $match: { status: "PLACED" },
          },
        ])
        .toArray();
      let cartShipped = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              prodId: "$products.item",
              products: "$products.prodName",
              quantity: "$products.quantity",
              totalAmount: "$products.totalPrice",
              status: "$products.status",
              paymentMode: "$paymentMode",
              date: "$date",
              time: "$time",
              mode: "$mode",
            },
          },
          {
            $match: { status: "SHIPPED" },
          },
        ])
        .toArray();

      let cartdDelivered = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              prodId: "$products.item",
              products: "$products.prodName",
              quantity: "$products.quantity",
              totalAmount: "$products.totalPrice",
              status: "$products.status",
              paymentMode: "$paymentMode",
              date: "$date",
              time: "$time",
              mode: "$mode",
            },
          },
          {
            $match: { status: "DELIVERED" },
          },
        ])
        .toArray();
      let cartCancelled = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { userId: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              prodId: "$products.item",
              products: "$products.prodName",
              quantity: "$products.quantity",
              totalAmount: "$products.totalPrice",
              status: "$products.status",
              paymentMode: "$paymentMode",
              date: "$date",
              time: "$time",
              mode: "$mode",
            },
          },
          {
            $match: { status: "CANCELLED" },
          },
        ])
        .toArray();

      let placed = buynowPlaced.concat(cartPlaced);
      let shipped = buynowShipped.concat(cartShipped);
      let cancelled = buynowCancelled.concat(cartCancelled);
      let delivered = buynowDelivered.concat(cartdDelivered);
      let obj = {
        placed: placed,
        shipped: shipped,
        cancelled: cancelled,
        delivered: delivered,
      };
      console.log("allorder sasdfa:", obj);
      resolve(obj);
    });
  },
  cartProductInvoice: (orderId, prodId) => {
    return new Promise(async (resolve, reject) => {
      let orderDetails = await db
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
              prodId: "$products.item",
              products: "$products.prodName",
              quantity: "$products.quantity",
              unitPrice: "$products.price",
              totalAmount: "$products.totalPrice",
              date: "$date",
              time: "$time",
              mode: "$mode",
              deliveryDetails: "$deliveryDetails",
            },
          },
          {
            $match: { prodId: objectId(prodId) },
          },
        ])
        .toArray();
      resolve(orderDetails[0]);
    });
  },
  getCat_Brands: () => {
    console.log('1234123423');
    return new Promise(async (resolve,reject) => {
      console.log('inside');
      let allCategories = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .find()
        .toArray();
      let allBrands = await db
        .get()
        .collection(collection.BRAND_COLLECTION)
        .find()
        .toArray();

      let cat_brand = {
        category: allCategories,
        brand: allBrands,
      };
      console.log('adminside',allCategories);
      resolve(cat_brand);
    });
  },
  deleteCategory: (catId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .deleteOne({ _id: objectId(catId) })
        .then(() => {
          resolve(response);
        });
    });
  },
  deleteBrand: (brandId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.BRAND_COLLECTION)
        .deleteOne({ _id: objectId(brandId) })
        .then(() => {
          resolve(response);
        });
    });
  },
  totalRevenue: () => {
    return new Promise(async (resolve, reject) => {
      let buyNowRevenue = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "buynow", status: "DELIVERED" },
          },
          {
            $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } },
          },
        ])
        .toArray();

      let cartRevenue = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "cart" },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              status: "$products.status",
              totalAmount: "$products.totalPrice",
            },
          },
          {
            $match: { status: "DELIVERED" },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
            },
          },
        ])
        .toArray();
      if (buyNowRevenue.length > 0) {
        total = buyNowRevenue[0].totalRevenue;
        resolve(total);
      } else if (cartRevenue.length > 0) {
        total = cartRevenue[0].totalRevenue;
        resolve(total);
      } else if (buyNowRevenue.length > 0 && cartRevenue.length > 0) {
        total = buyNowRevenue[0].totalRevenue + cartRevenue[0].totalRevenue;
        resolve(total);
      } else {
        total = 0;
        resolve(total);
      }
    });
  },
  recentOrders: () => {
    return new Promise(async (resolve, reject) => {
      let recentOrders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .sort({ _id: -1 })
        .limit(10)
        .toArray();
      console.log("asd", recentOrders);
      resolve(recentOrders);
    });
  },
  totalBrands: () => {
    return new Promise((resolve, reject) => {
      let count = db
        .get()
        .collection(collection.BRAND_COLLECTION)
        .find()
        .count();
      resolve(count);
    });
  },

  totalStock: () => {
    return new Promise(async (resolve, reject) => {
      let count = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .aggregate([
          {
            $group: {
              _id: null,
              totalStock: { $sum: "$stock" },
            },
          },
        ])
        .toArray();
        console.log('count',count);
        if(count.length>0)
        {
          resolve(count[0].totalStock)
        }else{
          count=0
          console.log('counthere',count);
          resolve(count)
        }
    });
  },
  lowStockProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ stock: { $lt: 50 } })
        .sort({ stock: 1 })
        .toArray();
      resolve(products);
    });
  },
  getOfferProducts:()=>{
    return new Promise((resolve,reject)=>{
      offerProducts=db.get().collection(collection.OFFER).find({product:{$exists:1}}).toArray()
      resolve(offerProducts)
    })
  },
  addBrandOffer: (offerDetails) => {
    return new Promise(async (resolve, reject) => {
      let offer = {
        brand: offerDetails.brand,
        discount: parseInt(offerDetails.discount),
        expiryDate: new Date(offerDetails.date).getTime(),
      };
      let offerExist = await db
        .get()
        .collection(collection.OFFER)
        .findOne({ brand: offerDetails.brand });
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ brand: offerDetails.brand })
        .toArray();
      if (offerExist) {
        resolve({ status: false });
      } else {
        await db
          .get()
          .collection(collection.OFFER)
          .insertOne(offer)
          .then(() => {
            resolve(products);
          });
      }
    });
  },

  addProductOffer: (offerDetails) => {
    return new Promise(async (resolve, reject) => {
      let offer = {
        product: offerDetails.product,
        discount: parseInt(offerDetails.discount),
        expiryDate: new Date(offerDetails.date).getTime(),
      };
      let offerExist = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ name: offerDetails.product, originalPrice: { $exists: 1 } });

      if (offerExist) {
        resolve({ status: false });
      } else {
        await db
          .get()
          .collection(collection.OFFER)
          .insertOne(offer)
          .then(async() => {
            product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({name:offerDetails.product})
            let price = product.price;
            let discountAmount = (product.price * offerDetails.discount) / 100;
            let offerPrice = price - discountAmount;
            await db
              .get()
              .collection(collection.PRODUCT_COLLECTION)
              .updateOne(
                { name: product.name },
                {
                  $set: {
                    price: parseInt(offerPrice),
                    originalPrice: price,
                    discount: offerDetails.discount,
                    productDiscount:true
                  },
                }
              );
            resolve({status:true});
          });
      }
    });
  },
  updateBrandDiscountPrice: (product, offerDetails) => {
    return new Promise(async (resolve, reject) => {
      let price = product.price;
      let discountAmount = (product.price * offerDetails.discount) / 100;
      let offerPrice = price - discountAmount;
      productOfferExist= await db.get().collection(collection.PRODUCT_COLLECTION).findOne({name: product.name,originalPrice: { $exists: 1 }})
      console.log('offerextist',productOfferExist);
      if(productOfferExist){     
        resolve()
      }else{
        await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { name: product.name },
          {
            $set: {
              price: parseInt(offerPrice),
              originalPrice: price,
              discount: offerDetails.discount
           },
          }
        )
        .then(() => {
          resolve();
        });
      }
    });
  },
  getAllOfferBrands: () => {
    return new Promise(async (resolve, reject) => {
      allBrands = await db.get().collection(collection.OFFER).find({brand:{$exists:1}}).toArray();
      resolve(allBrands);
    });
  },
  deleteBrandOffer: (offerId) => {
    return new Promise(async (resolve, reject) => {
      let offer = await db
        .get()
        .collection(collection.OFFER)
        .findOne({ _id: objectId(offerId) });
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ brand: offer.brand })
        .toArray();
      await db
        .get()
        .collection(collection.OFFER)
        .deleteOne({ _id: objectId(offerId) })
        .then(() => {
          resolve(products);
        });
    });
  },
  deleteProductOffer:(offerId)=>{
    return new Promise(async(resolve,reject)=>{
      let offer = await db
      .get()
      .collection(collection.OFFER)
      .findOne({ _id: objectId(offerId) });
      let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ name: offer.product })
        console.log('prod is here',products);
      await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({name:offer.product},{$set:{price:products.originalPrice},$unset:{originalPrice:1,discount:1,productDiscount:1}})
      await db
        .get()
        .collection(collection.OFFER)
        .deleteOne({ _id: objectId(offerId) })
        .then(() => {
          resolve();
        });
    })  
  },
  removeBrandDiscountPrice: (product) => {
    return new Promise(async (resolve, reject) => {
      if(product.productDiscount==true)
      {
        resolve()
      }else
      {
        await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(product._id) },
          {
            $set: { price: product.originalPrice },
            $unset: { originalPrice: 1,discount:1 },
          }
        )
        .then(() => {
          resolve();
        });
      }
    });
  },
  offerExpiry: () => {
    return new Promise(async (resolve, reject) => {
      let currentDate = new Date().getTime();
      let allOffers = await db
        .get()
        .collection(collection.OFFER)
        .find({ expiryDate: { $lt: currentDate } })
        .toArray();

      resolve(allOffers);
    });
  },
  couponExpiry: () => {
    return new Promise(async (resolve, reject) => {
      let currentDate = new Date().getTime();
      let allOffers = await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .find({ expiry: { $lt: currentDate } })
        .toArray();

      resolve(allOffers);
    });
  },
  deleteCouponOfferOnLogin: (offers) => {
    return new Promise(async (resolve, reject) => {
      // let offer=await db.get().collection(collection.OFFER).findOne({_id:objectId(offerId)})
      await db
        .get()
        .collection(collection.COUPEN_COLLECTION)
        .deleteOne({ _id: objectId(offers._id) })
        .then(() => {
          resolve();
        });
    });
  },
  deleteBrandOfferOnLogin: (offers) => {
    console.log('brand',offers);
    return new Promise(async (resolve, reject) => {
      // let offer=await db.get().collection(collection.OFFER).findOne({_id:objectId(offerId)})
      if(offers){
        let products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ brand: offers.brand })
        .toArray();
      await db
        .get()
        .collection(collection.OFFER)
        .deleteOne({ _id: objectId(offers._id) })
        .then(() => {
          resolve(products);
        });
      }else{
        resolve()
      }     
    });
  },
  paymentModeCount: () => {
    return new Promise(async (resolve, reject) => {
      let codCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMode: "COD" })
        .count();
      let razorpayCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMode: "Razorpay" })
        .count();
      let payPalCount = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ paymentMode: "Paypal" })
        .count();

      count = {
        cod: codCount,
        razorpay: razorpayCount,
        paypal: payPalCount,
      };
      console.log("payment", count);
      resolve(count);
    });
  },
  getCategoryProd: (catName) => {
    return new Promise(async (resolve, reject) => {
      products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ category: catName })
        .toArray();
      resolve(products);
    });
  },
  getBrandProd: (brandName) => {
    return new Promise(async (resolve, reject) => {
      products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ brand: brandName })
        .toArray();
      resolve(products);
    });
  },
  getAllOfferProd: () => {
    return new Promise(async (resolve, reject) => {
      products = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ originalPrice: { $exists: true } })
        .toArray();
      resolve(products);
    });
  },
  addBanner: (data) => {
    return new Promise(async (resolve, reject) => {
      console.log("submit body", data);
      bannerCount = await db.get().collection(collection.BANNER).find().count();
      if (bannerCount >= 4) {
        resolve({ status: false });
      } else {
        bannerExist = await db
          .get()
          .collection(collection.BANNER)
          .findOne({ brand: data.brand });
        if (bannerExist) {
          console.log("banner exist");
          resolve({ status: "exist" });
        } else {
          brandInfo = await db
            .get()
            .collection(collection.OFFER)
            .findOne({ brand: data.brand });
          let obj = {
            brand: data.brand,
            discount: brandInfo.discount,
            description: data.description,
          };
          await db
            .get()
            .collection(collection.BANNER)
            .insertOne(obj)
            .then((response) => {
              console.log("response", response);
              resolve(response);
            });
        }
      }
    });
  },
  getAllBanners: () => {
    return new Promise(async (resolve, reject) => {
      banners = await db
        .get()
        .collection(collection.BANNER)
        .find()
        .sort({ _id: -1 })
        .toArray();
      resolve(banners);
    });
  },
  getAllBannerToUser: () => {
    return new Promise(async (resolve, reject) => {
      banners = await db
        .get()
        .collection(collection.BANNER)
        .find()
        .sort({ _id: -1 })
        .toArray();
      allBanners = {
        banner1: banners[0],
        banner2: banners[1],
      };
      resolve(allBanners);
    });
  },
  deleteBanner: (bannerId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.BANNER)
        .deleteOne({ _id: objectId(bannerId) });
      resolve(response);
    });
  },
  getOfferBrands: () => {
    return new Promise(async (resolve, reject) => {
      offerBrands = await db
        .get()
        .collection(collection.OFFER)
        .find()
        .toArray();
      resolve(offerBrands);
    });
  },
  getDeliveredProducts: () => {
    return new Promise(async (resolve, reject) => {
      buyNowDelivered = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ mode: "buynow", status: "DELIVERED" })
        .toArray();
      cartDeliverd = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { mode: "cart" },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              orderId: "$_id",
              deliveryDetails: "$deliveryDetails",
              totalAmount: "$products.totalPrice",
              paymentMode: "$paymentMode",
              date: "$date",
              status: "$products.status",
            },
          },
          {
            $match: {
              status: "DELIVERED",
            },
          },
        ])
        .toArray();

      const deliverdProd = buyNowDelivered.concat(cartDeliverd);
      resolve(deliverdProd);
    });
  },
};
