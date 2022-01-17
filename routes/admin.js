const { response, query } = require("express");
var express = require("express");
const productHelpers = require("../helpers/productHelpers");
var router = express.Router();
var productHelper = require("../helpers/productHelpers");
const userHelpers = require("../helpers/userHelpers");
const { route } = require("./user");

router.get("/", async function (req, res, next) {
  if (req.session.adminLogin) {
    let orderCount = await productHelper.orderCount();
    let shippedCount = await productHelper.shippedCount();
    let cancelCount = await productHelper.cancelledCount();
    let deliveredCount = await productHelper.deliveredCount();
    let totalRevenue = await productHelpers.totalRevenue();
    let totalBrands = await productHelpers.totalBrands();
    let totalStock = await productHelpers.totalStock();
    let lowStock = await productHelpers.lowStockProducts();
    let paymentModeCount = await productHelpers.paymentModeCount();
    let recentOrders = await productHelpers.recentOrders();
    res.render("admin/adminHome", {
      header: "Admin Home",
      adminHome: true,
      adminSession: req.session.adminLogin,
      orderCount,
      shippedCount,
      cancelCount,
      deliveredCount,
      totalRevenue,
      totalBrands,
      totalStock,
      lowStock,
      paymentModeCount,
      recentOrders,
    });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
    req.session.adminLoginError = false;
  }
});

const credentials = {
  username: process.env.adminUsername,
  password: process.env.adminPassword,
};

router.post("/adminHome", (req, res) => {
  if (
    req.body.Name == credentials.username &&
    req.body.Password == credentials.password
    
  ) {
    
    req.session.adminLogin = true;
    res.redirect("/admin");
  } else {
    req.session.adminLoginError = true;
    res.redirect("/admin");
  }
});

router.get("/logout", (req, res) => {
  req.session.adminLogin = false;
  res.redirect("/admin");
});

router.get("/product", async(req, res) => {
  if (req.session.adminLogin) {
    data=await productHelpers.allProducts()
      res.render("admin/product", {
        adminHome: true,
        data,
        categoryAdd: req.session.categoryAdd,
      });
      req.session.categoryAdd = false;
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});

router.get("/productAdd", async (req, res) => {
  if (req.session.adminLogin) {
    let option = await productHelpers.getCat_Brands();

    res.render("admin/productAdd", { adminHome: true, option });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});

router.post("/productAddSubmit", (req, res) => {
  productHelper.addProduct(req.body).then((data) => {
    // let image1 = req.files.image1;
    // let image2 = req.files.image2;
    // let image3 = req.files.image3;

    // image1.mv("./public/products/" + data.insertedId + "__1.jpg");
    // image2.mv("./public/products/" + data.insertedId + "__2.jpg");
    // image3.mv("./public/products/" + data.insertedId + "__3.jpg");
    if (req.files) {
      if (req.files.image1) {
        let image1 = req.files.image1;
        image1.mv("./public/products/" + data.insertedId + "__1.jpg");
      }
      if (req.files.image2) {
        let image2 = req.files.image2;
        image2.mv("./public/products/" + data.insertedId + "__2.jpg");
      }
      if (req.files.image3) {
        let image3 = req.files.image3;
        image3.mv("./public/products/" + data.insertedId + "__3.jpg");
      }
    }
    res.redirect("/admin/productAdd");
  });
});

router.get("/deleteProduct/:id", (req, res) => {
  let prodId = req.params.id;

  productHelpers.deleteProduct(prodId).then((response) => {
    res.redirect("/admin/product");
  });
});
router.get("/productEdit/:id", async (req, res) => {
  if (req.session.adminLogin) {
    let option = await productHelpers.getCat_Brands();
    let prodId = req.params.id;

    productHelpers.getProduct(prodId).then((data) => {
      res.render("admin/productEdit", { adminHome: true, data, option });
    });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});
router.post("/proEditSubmit/", (req, res) => {
  let proId = req.query.id;
  console.log("proid", proId);
  productHelpers.editProduct(proId, req.body).then(() => {
    if (req.files) {
      if (req.files.image1) {
        let image1 = req.files.image1;
        image1.mv("./public/products/" + proId + "__1.jpg");
      }
      if (req.files.image2) {
        let image2 = req.files.image2;
        image2.mv("./public/products/" + proId + "__2.jpg");
      }
      if (req.files.image3) {
        let image3 = req.files.image3;
        image3.mv("./public/products/" + proId + "__3.jpg");
      }
    }
    res.redirect("/admin/product");
  });
});

router.get("/userManage", (req, res) => {
  if (req.session.adminLogin) {
    userHelpers.getAllUsers().then((users) => {
      res.render("admin/userManage", {
        adminHome: true,
        users,
        blockStatus: req.session.blockUser,
      });
    });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});

router.get("/userBlock/:id", (req, res) => {
  userId = req.params.id;
  console.log(userId);
  userHelpers.blockUser(userId).then((response) => {
    res.json(response);
  });
});

router.get("/userUnBlock/:id", (req, res) => {
  userHelpers.unBlockUser(req.params.id).then((response) => {
    res.json(response);
  });
});

router.post("/addCategory", async (req, res) => {
  await productHelpers.addCategory(req.body).then((response) => {
    let catImage1 = req.files.catImage;
    catImage1.mv("./public/category/" + response + ".jpg");
    res.redirect("/admin/category&brand");
  });
});

router.get("/orderManage", async (req, res) => {
  if (req.session.adminLogin) {
    let allOrders = await userHelpers.getAllUserOrders();
    console.log("ORders are : ", allOrders);
    res.render("admin/orderManage", { adminHome: true, allOrders });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});

router.get("/productOrderStatus/:id", async (req, res) => {
  if (req.session.adminLogin) {
    id = req.params.id;
    let ordermethod = await userHelpers.paymentModeCheck(id);
    console.log("order", ordermethod);
    if (ordermethod.mode == "buynow") {
      console.log("buy noe");
      res.render("admin/productOrderStatus", { adminHome: true, ordermethod });
    } else if (ordermethod.mode == "cart") {
      console.log("cart");
      await userHelpers.getUserOrdersAdmin(id).then(async (orders) => {
        let products = await userHelpers.getProdsInOrder(id);
        console.log('prods',products);
        res.render("admin/productOrderStatus", { adminHome: true, products });
      });
    }
  } else {
    res.render("admin/adminLogin", {
      header: "Admin login",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});

router.get("/productOrderStatusSubmit/", async (req, res) => {
  orderId = req.query.orderId;
  prodId = req.query.prodId;
  update = req.query.status;
  let ordermethod = await userHelpers.paymentModeCheck(id);

  console.log("order", orderId, "prod", prodId, "update", update);
  await productHelper
    .updateProductStatus(orderId, prodId, update, ordermethod.mode)
    .then((data) => {
      res.redirect("/admin/productOrderStatus/" + orderId);
    });
});

router.get("/coupenManagement", async (req, res) => {
  if (req.session.adminLogin) {
    let coupons = await userHelpers.showAllCoupon();
    console.log(coupons);
    res.render("admin/coupens", { adminHome: true, coupons });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin Panel",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});
router.post("/addCoupon", (req, res) => {
  userHelpers.addCoupon(req.body).then((response) => {
    console.log(response, "despponse");
    res.json(response);
  });
});

router.get("/deleteCoupon/:id", (req, res) => {
  id = req.params.id;
  userHelpers.deleteCoupon(id).then(() => {
    res.redirect("/admin/coupenManagement");
  });
});

router.get("/category&brand", async (req, res) => {
  let allCat_Brand = await productHelpers.getCat_Brands();
  console.log("allcat", allCat_Brand);
  res.render("admin/category&brand", { adminHome: true, allCat_Brand });
});

router.post("/addBrand", async (req, res) => {
  await productHelpers.addBrand(req.body).then((response) => {
    let brandImage1 = req.files.brandImage;
    brandImage1.mv("./public/brands/" + response + ".jpg");
    res.redirect("/admin/category&brand");
  });
});
router.get("/deleteCategory/", (req, res) => {
  catId = req.query.catId;
  productHelpers.deleteCategory(catId).then((response) => {
    res.json(response);
  });
});
router.get("/deleteBrand/", (req, res) => {
  brandId = req.query.brandId;
  productHelpers.deleteBrand(brandId).then((response) => {
    res.json(response);
  });
});
router.get("/brandOfferManagement", async (req, res) => {
  if (req.session.adminLogin) {
    let allCat_Brands = await productHelpers.getCat_Brands();
    let brands = await productHelpers.getAllOfferBrands();
    res.render("admin/offer", { adminHome: true, brands, allCat_Brands });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin Panel",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});
router.get("/productOfferManagement", async (req, res) => {
  if (req.session.adminLogin) {
    let products = await productHelpers.allProducts();
    let offerProducts= await productHelpers.getOfferProducts()
    res.render("admin/productOffer", { adminHome: true,products,offerProducts});
  } else {
    res.render("admin/adminLogin", {
      header: "Admin Panel",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
})
router.post("/addBrandOffer", (req, res) => {
  console.log(req.body);
  productHelpers.addBrandOffer(req.body).then(async (response) => {
    if (response.status == false) {
      console.log("false");
      res.json(response);
    } else {
      console.log("true");
      await response.map((products) => {
        productHelpers.updateBrandDiscountPrice(products, req.body);
      });
      res.json({ status: true });
    }
  });
});
router.post("/addProductOffer", (req, res) => {
  console.log(req.body);
  productHelpers.addProductOffer(req.body).then(async (response) => {
    if (response.status == false) {
      console.log("false");
      res.json(response);
    } else {
      console.log("true");
      res.json({ status: true });
    }
  });
});
router.get("/deleteProductOffer/", async (req, res) => {
  await productHelpers
    .deleteProductOffer(req.query.offerId)
    .then(() => {
      res.json({ status: true });
    });
});

router.get("/deleteBrandOffer/", async (req, res) => {
  await productHelpers
    .deleteBrandOffer(req.query.offerId)
    .then(async (response) => {
      await response.map((products) => {
        productHelpers.removeBrandDiscountPrice(products);
      });
      res.json({ status: true });
    });
});

router.get("/bannerAds", async (req, res) => {
  if (req.session.adminLogin) {
    brands = await productHelpers.getOfferBrands();
    console.log("body", brands);
    banners = await productHelpers.getAllBanners();
    res.render("admin/bannerAds", {
      header: "Admin Panel",
      adminHome: true,
      brands,
      banners,
      bannerLimit:req.session.bannerLimit,
      bannerExist:req.session.bannerExist
    });
    req.session.bannerLimit = false;
    req.session.bannerExist=false
  } else {
    res.render("admin/adminLogin", {
      header: "Admin Panel",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});

router.post("/bannerAdd", (req, res) => {
  if (req.session.adminLogin) {
    productHelpers.addBanner(req.body).then((data) => {
      if (data.status == false) {
        req.session.bannerLimit = true;
        res.redirect("/admin/bannerAds");
      } else if(data.status=="exist"){
        req.session.bannerExist=true
        res.redirect("/admin/bannerAds");
      }else{
        let image2 = req.files.image2;
        image2.mv("./public/banners/" + data.insertedId + ".jpg");
       res.redirect("/admin/bannerAds");
      }
    });
  } else {
    res.render("admin/adminLogin", {
      header: "Admin Panel",
      adminLogin: true,
      adminLoginError: req.session.adminLoginError,
    });
  }
});
router.get("/deleteBanner/", (req, res) => {
  productHelpers.deleteBanner(req.query.bannerId).then((response) => {
    res.json(response);
  });
});
router.get("/reports", async (req, res) => {
  let allOrders = await userHelpers.getAllUserOrders();
  let deliveredProd = await productHelpers.getDeliveredProducts();
  res.render("admin/reports", { adminHome: true, allOrders, deliveredProd });
});

router.post("/totalSalesBetweenDates", async (req, res, next) => {
  console.log(req.body);
  let startDate = req.body.startDate;
  let endDate = req.body.endDate;

  if (req.body.list === "totalOrders") {
    let totalOrders = await userHelpers.getAllUserOrders();
    day = startDate.slice(8, 10);
    month = startDate.slice(5, 7);
    year = startDate.slice(0, 4);
    newStartDate = month + "/" + day + "/" + year;
    endday = endDate.slice(8, 10);
    endmonth = endDate.slice(5, 7);
    endyear = endDate.slice(0, 4);
    newEndDate = endmonth + "/" + endday + "/" + endyear;
    console.log("day....", newStartDate, newEndDate);
    let filteredItems = totalOrders.filter(
      (item, index) => item.date >= newStartDate && item.date <= newEndDate
    );
    let SortedArray = filteredItems.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    let todaysDate = new Date().toISOString().slice(0, 10);
    console.log("sorted", SortedArray);
    res.render("admin/filteredOrders", {
      adminHome: true,
      SortedArray,
      todaysDate,
    });
  } else if (req.body.list === "deliveredOrders") {
    let totalDeliveredOrder = await productHelpers.getDeliveredOrders();
    let filteredItems = totalDeliveredOrder.filter(
      (item, index) => item.date >= startDate && item.date <= endDate
    );
    let SortedArray = filteredItems.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    res.render("admin/admin-filteredOrders", {
      typeOfPersonAdmin: true,
      admin: true,
      delivered: true,
      SortedArray,
    });
  } else if (req.body.list === "cancelled") {
    let totalCancelledOrder = await productHelpers.getCancelledOrders();
    let filteredItems = totalCancelledOrder.filter(
      (item, index) => item.date >= startDate && item.date <= endDate
    );
    let SortedArray = filteredItems.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });
    res.render("admin/admin-filteredOrders", {
      typeOfPersonAdmin: true,
      admin: true,
      cancelled: true,
      SortedArray,
    });
  } else if (req.body.list === "returnedOrders") {
    let todaysDate = new Date().toISOString().slice(0, 10);
    let totalReturnedOrder = await productHelpers.getReturnedOrders();
    let filteredItems = totalReturnedOrder.filter(
      (item, index) => item.date >= startDate && item.date <= endDate
    );
    let SortedArray = filteredItems.sort((a, b) => {
      return new Date(a.date) - new Date(b.date);
    });

    res.render("admin/filteredOrders", {
      adminHome: true,
      SortedArray,
      todaysDate,
    });
  }
});
module.exports = router;
