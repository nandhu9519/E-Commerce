const { response, query } = require("express");
var express = require("express");
const productHelpers = require("../helpers/productHelpers");
var router = express.Router();
const userHelpers = require("../helpers/userHelpers");
const otpkeys = require("../config/otpkeys");
const client = require("twilio")(otpkeys.accountsId, otpkeys.authToken);
var objectId = require("mongodb").ObjectId;
const { totalAmount } = require("../helpers/userHelpers");
const { v4: uuidv4 } = require("uuid");

//Guest home page
router.get("/", async function (req, res, next) {
  if (req.session.userloggedIn) {
    res.redirect("/userHome");
  } else {
    let banners = await productHelpers.getAllBannerToUser();
    data = await productHelpers.allProducts();
    res.render("user/guestHome", {
      header: "ETron Guest Home",
      guestHome: true,
      signupErrorStatus: req.session.signupError,
      data,
      banners,
    });
    req.session.signupError = false;
  }
});

//Redirecting OTP routes from signup, login, forgot password
router.get("/otpRoute", (req, res) => {
  let token = req.query.id;
  if (token == "signup") {
    console.log("signup");
    req.session.resendOtp = req.session.signUpData;
    req.session.signUpResendOtp = true;
    res.redirect("/resendOTP");
  } else if (token == "login") {
    req.session.resendOtp = req.session.userContact;
    req.session.loginResendOtp = true;
    res.redirect("/resendOTP");
  } else if (token == "forgotPass") {
    req.session.resendOtp = req.session.forgotPassData;
    req.session.passwordResendOtp = true;
    res.redirect("/resendOTP");
  }
});

//resend OTP
router.get("/resendOTP", async (req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  console.log("session", req.session.signUpdata);

  contactno1 = "91" + req.session.resendOtp.contact;
  contactno = parseInt(contactno1);
  await client.verify
    .services(otpkeys.serviceId)
    .verifications.create({ to: "+" + contactno1, channel: "sms" })
    .then((verification) => console.log(verification.serviceId))
    .catch((err) => {
      req.session.otpServerError = true;
      console.log("TTTTTTTT : ", err);
    });
  if (req.session.signUpResendOtp) {
    console.log("222222");
    res.redirect("/signUpValidation");
  } else if (req.session.loginResendOtp) {
    res.redirect("/loginOTPverify");
  } else if (req.session.passwordResendOtp) {
    res.redirect("/OTP");
  }
});

//Render signup page
router.get("/signup", (req, res) => {
  res.render("user/signUp", {
    loginform: true,
    signupError: req.session.signupError,
  });
  req.session.signupError = false;
});

//Signup data submission
router.post("/signUpValidation", async (req, res) => {
  userExist = await userHelpers.signUpValidation(req.body);
  if (userExist.status) {
    req.session.signupError = true;
    res.redirect("/signup");
  } else {
    const obj = JSON.parse(JSON.stringify(req.body));
    req.session.signUpData = req.body;
    console.log("req.body", req.body);
    console.log("session", req.session.signUpData);

    contactno1 = "91" + req.body.contact;
    contactno = parseInt(contactno1);
    await client.verify
      .services(otpkeys.serviceId)
      .verifications.create({ to: "+" + contactno1, channel: "sms" })
      .then((verification) => console.log(verification.serviceId))
      .catch((err) => {
        req.session.otpServerError = true;
        console.log("TTTTTTTT : ", err);
      });
    res.redirect("/signUpValidation");
  }
});

//Render signup OTP verifying page 
router.get("/signUpValidation", (req, res) => {
  res.render("user/signUpValidation", {
    loginform: true,
    incorrectOTP: req.session.incorrectOTP,
    otpServerError: req.session.otpServerError,
  });
  req.session.incorrectOTP = false;
  req.session.otpServerError = false;
});

//Signup OTP verify submit
router.post("/signUpValidationSubmit", (req, res) => {
  contactno1 = req.session.signUpData.contact;
  contactno = parseInt(contactno1);
  client.verify
    .services(otpkeys.serviceId)
    .verificationChecks.create({
      to: "+91" + contactno1,
      code: req.body.otp,
    })
    .then((verification_check) => {
      console.log(verification_check.status);

      if (verification_check.status == "approved") {
        userHelpers.Signup(req.session.signUpData).then((signupResponse) => {
          if (signupResponse) {
            req.session.userFromSignUp = true;
            res.redirect("/loginform");
          }
        });
      } else {
        otpError = "Invalid OTP";
        console.log(otpError);
        req.session.incorrectOTP = true;
        res.redirect("/signUpValidation");
      }
    })
    .catch((err) => {
      console.log("THERR err : ", err);
      req.session.otpServerError = true;
      res.redirect("/signUpValidation");
    });
});

//Login page render
router.get("/loginform/", (req, res) => {
  if (req.session.userloggedIn) {
    res.redirect("/userHome");
  } else {
    token = req.query.token;
    if (token == "guestToBuyNow") {
      console.log("guestobuy now");
      req.session.guestToBuyNow = true;
      req.session.guestToBuyNowProdId = req.query.prodId;
    }
    res.render("user/login", {
      loginform: true,
      loginErrorStatus: req.session.loginError,
      userfromsignupShow: req.session.userFromSignUp,
      blockError: req.session.blockError,
      passChange: req.session.passChange,
    });
    req.session.loginError = false;
    req.session.userFromSignUp = false;
    req.session.blockError = false;
    req.session.passChange = false;
    req.session.signUpResendOtp = false;
  }
});

//Render login using OTP page
router.get("/loginUsingOTP", (req, res) => {
  res.render("user/loginUsingOTP", {
    loginform: true,
    contactError: req.session.contactError,
  });
  req.session.contactError = false;
});

router.post("/loginUsingOTPSubmit", (req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  req.session.userContact = req.body;
  console.log("session", req.session.userContact);
  userHelpers.verifyContact(req.body).then(async (response) => {
    console.log("response", response);
    if (response.status == true) {
      console.log("otp respnse", response);
      req.session.user = response.info;
      contactno1 = req.body.countrycode + req.body.contact;
      contactno = parseInt(contactno1);
      await client.verify
        .services(otpkeys.serviceId)
        .verifications.create({ to: "+" + contactno1, channel: "sms" })
        .then((verification) => console.log(verification.serviceId))
        .catch((err) => {
          req.session.otpServerError = true;
          console.log("TTTTTTTT : ", err);
        });
      res.redirect("/loginOTPverify");
    } else {
      req.session.contactError = true;
      res.redirect("/loginUsingOTP");
    }
  });
});

router.get("/loginOTPverify", (req, res) => {
  userContact = req.session.userContact.contact;
  res.render("user/loginOTPverify", {
    loginform: true,
    userContact,
    incorrectOTP: req.session.incorrectOTP,
    otpServerError: req.session.otpServerError,
  });
  req.session.incorrectOTP = false;
  req.session.loginResendOtp = false;
});

router.post("/loginOTPVerifySubmit", (req, res) => {
  contactno1 = req.body.contact;
  contactno = parseInt(contactno1);
  client.verify
    .services(otpkeys.serviceId)
    .verificationChecks.create({
      to: "+91" + req.session.userContact.contact,
      code: req.body.otp,
    })
    .then((verification_check) => {
      console.log(verification_check.status);

      if (verification_check.status == "approved") {
        req.session.userloggedIn = true;
        res.redirect("/userHome");
      } else {
        otpError = "Invalid OTP";
        console.log(otpError);
        req.session.incorrectOTP = true;
        res.redirect("/loginOTPverify");
      }
    })
    .catch((err) => {
      console.log("THERR err : ", err);
      req.session.otpServerError = true;
      res.redirect("/loginOTPverify");
    });
});

router.get("/userHome", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cartCount = await userHelpers.cartCount(userData);
    let cart = await userHelpers.getCartProducts(userData);
    let data = await productHelpers.allProducts();

    let banners = await productHelpers.getAllBannerToUser();
    expiredCoupons = await productHelpers.couponExpiry();
    expiredCoupons.map(async (coupons) => {
      await productHelpers.deleteCouponOfferOnLogin(coupons);
    });

    await productHelpers.deleteBrandOfferOnLogin();
    await productHelpers.offerExpiry().then((response) => {
      response.map(async (offers) => {
        await productHelpers.deleteBrandOfferOnLogin(offers).then((data) => {
          data.map(async (products) => {
            await productHelpers.removeBrandDiscountPrice(products);
          });
        });
      });
    });

    res.render("user/userHome", {
      header: "userhome",
      loggedinStatus: req.session.userloggedIn,
      userName: response.name,
      data,
      wishListCount,
      banners,
      userData,
      cartCount,
      cart,
    });
  } else {
    console.log("redirect");
    res.redirect("/");
  }
});

router.post("/loginSubmit", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status == true) {
      req.session.userloggedIn = true;
      req.session.user = response._id;
      if (req.session.guestToBuyNow == true) {
        console.log("asdadasfasdas");
        res.redirect("/buyNowCheckOut?id=" + req.session.guestToBuyNowProdId);
      }
      res.redirect("/userHome");
    } else if (response.status == "blocked") {
      req.session.blockError = true;
      res.redirect("/loginform");
    } else {
      req.session.loginError = true;
      res.redirect("/loginform");
    }
  });
});

router.get("/singleProd/", (req, res) => {
  productHelpers.singleView(req.query.id).then(async (data) => {
    if (req.session.userloggedIn) {
      let userData = req.session.user;
      let cartCount = await userHelpers.cartCount(userData);
      let wishListCount = await userHelpers.wihslistCount(userData);
      let wishList = await userHelpers.getWishList(userData);
      let cart = await userHelpers.getCartProducts(userData);
      res.render("user/singleProdUser", {
        header: "ETron bay",
        loggedinStatus: req.session.userloggedIn,
        data,
        cart,
        wishList,
        wishListCount,
        cartCount,
      });
    } else {
      res.render("user/singleProd", {
        header: "ETron bay",
        guestHome: true,
        data,
      });
    }
  });
});

router.get("/userLogout", (req, res) => {
  req.session.userloggedIn = false;
  res.redirect("/");
});

router.get("/verifyContact", (req, res) => {
  res.render("user/verifyContact", {
    loginform: true,
    contactError: req.session.contactError,
  });
  req.session.contactError = false;
});

router.post("/verifyContactSubmit", async (req, res) => {
  userHelpers.verifyContact(req.body).then(async (response) => {
    req.session.forgotPassData = req.body;
    if (response.status) {
      contactno1 = req.body.countrycode + req.body.contact;
      contactno = parseInt(contactno1);
      await client.verify
        .services(otpkeys.serviceId)
        .verifications.create({ to: "+" + contactno1, channel: "sms" })
        .then((verification) => console.log(verification.serviceId))
        .catch((err) => {
          console.log("TTTTTTTT : ", err);
          req.session.otpServerError = true;
        });
      console.log(contactno);
      res.redirect("/OTP");
    } else {
      req.session.contactError = true;
      res.redirect("/verifyContact");
    }
  });
});
router.get("/OTP", (req, res) => {
  res.render("user/OTP", {
    loginform: true,
    otpServerError: req.session.otpServerError,
  });
  req.session.otpServerError = false;
});

router.post("/otpSubmit", (req, res) => {
  contactno1 = req.session.forgotPassData.contact;
  console.log("contactno1", contactno1);
  contactno = parseInt(contactno1);
  client.verify
    .services(otpkeys.serviceId)
    .verificationChecks.create({
      to: "+91" + contactno1,
      code: req.body.otp,
    })
    .then((verification_check) => {
      console.log(verification_check.status);

      if (verification_check.status == "approved") {
        res.render("user/changePass", { loginform: true, contactno });
      } else {
        req.session.otpError = "Invalid OTP";
        res.redirect("/OTP");
      }
    })
    .catch((err) => {
      console.log("THERR err : ", err);
    });
});

router.post("/changePassSubmit", (req, res) => {
  userHelpers
    .forgotPassword(req.body, req.session.forgotPassData.contact)
    .then((data) => {
      if (data) {
        req.session.passChange = true;
        res.redirect("/loginform");
      } else redirect("/changePassSubmit");
    });
});
router.get("/addToCart/:id/:price", (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    userHelpers
      .addToCart(userData, req.params.id, req.params.price)
      .then(() => {
        res.json({ status: true });
      });
  } else {
    redirect("/");
  }
});

router.get("/cart", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    console.log("id", userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cartCount = await userHelpers.cartCount(userData);
    let products = await userHelpers.getCartProducts(userData);
    console.log("cartprod", products);

    let totalAmount = await userHelpers.totalAmount(userData);

    if (products) {
      res.render("user/cart", {
        products,
        loggedinStatus: req.session.userloggedIn,
        userData,
        totalAmount,
        wishListCount,
        cartCount,
      });
    } else {
      res.render("user/cart", {
        loggedinStatus: req.session.userloggedIn,
        userData,
        cart: true,
        cartCount,
        wishListCount,
      });
    }
  }
});

router.post("/change-product-quantity", (req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.totalAmount = await userHelpers.totalAmount(req.body.user);
    res.json(response);
  });
});
router.post("/removeCartProduct", (req, res) => {
  userHelpers.removeCartProduct(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/checkout", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cartCount = await userHelpers.cartCount(userData);
    let totalAmount = await userHelpers.totalAmount(userData);
    let userAdd = await userHelpers.getUserAddress(userData);

    res.render("user/checkout", {
      loggedinStatus: req.session.userloggedIn,
      totalAmount,
      cartCount,
      wishListCount,
      userData,
      userAdd,
    });
  }
});
//cart order placing
router.post("/placeOrder", async (req, res) => {
  if (req.session.userloggedIn) {
    req.session.refId = uuidv4();
    req.session.cartorderData = req.body;

    if (req.body.hidden) {
      let products = await userHelpers.getCartProductList(req.body.userId);
      req.session.cartProducts = products;
      let totalAmount = req.body.hidden;
      req.session.cartTotalAmount = req.body.hidden;
      if (req.body.paymentMode === "COD") {
        userHelpers
          .placeOrder(req.body, products, totalAmount)
          .then((orderId) => {
            products.map((data) => {
              userHelpers.cartStockUpdate(data);
              console.log(data);
            });
            res.json({ codSuccess: true });
          });
      } else if (req.body.paymentMode === "Razorpay") {
        userHelpers
          .generateRazorPay(req.session.refId, totalAmount)
          .then((response) => {
            res.json(response);
          });
      } else if (req.body.paymentMode === "Paypal") {
        userHelpers
          .generatePaypal(req.session.refId, req.body.usdToInr)
          .then((paySuccess) => {
            userHelpers
              .placeOrder(req.body, products, totalAmount)
              .then((orderId) => {
                products.map((data) => {
                  userHelpers.cartStockUpdate(data);
                  console.log(data);
                });
                res.json(paySuccess);
              });
          })
          .catch((err) => {
            console.log("PayPal Err:", err);
          });
      }
    } else {
      let userData = req.session.user;
      let products = await userHelpers.getCartProductList(req.body.userId);
      let totalAmount = await userHelpers.totalAmount(userData);
      req.session.cartProducts = products;
      req.session.cartTotalAmount = totalAmount;
      console.log("carttotalamount", totalAmount);

      if (req.body.paymentMode === "COD") {
        userHelpers
          .placeOrder(req.body, products, totalAmount)
          .then((orderId) => {
            products.map((data) => {
              userHelpers.cartStockUpdate(data);
              console.log(data);
            });
            res.json({ codSuccess: true });
          });
      } else if (req.body.paymentMode === "Razorpay") {
        userHelpers
          .generateRazorPay(req.session.refId, totalAmount)
          .then((response) => {
            res.json(response);
          });
      } else if (req.body.paymentMode === "Paypal") {
        userHelpers
          .generatePaypal(req.session.refId, req.body.usdToInr)
          .then((paySuccess) => {
            userHelpers
              .placeOrder(req.body, products, totalAmount)
              .then((orderId) => {
                products.map((data) => {
                  userHelpers.cartStockUpdate(data);
                  console.log(data);
                });
                res.json(paySuccess);
              });
          })
          .catch((err) => {
            console.log("PayPal Err:", err);
          });
      }
    }
  }
});
router.post("/verifyPayment", (req, res) => {
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      console.log("payment success");
      res.json({ status: true });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false, errMsg: "" });
    });
});
router.get("/razorpayCartPlaceOrder", (req, res) => {
  if (req.session.userloggedIn) {
    userHelpers
      .placeOrder(
        req.session.cartorderData,
        req.session.cartProducts,
        req.session.cartTotalAmount
      )
      .then((orderId) => {
        req.session.cartProducts.map((data) => {
          userHelpers.cartStockUpdate(data);
        });
        req.session.cartorderData = false;
        req.session.cartTotalAmount = false;
        req.session.cartProducts = false;
        req.session.refId = false;
        res.redirect("/orderConformation");
      });
  } else {
    res.redirect("/");
  }
});

router.get("/orderConformation", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    let orderInfo = await userHelpers.getOrder(userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cartCount = await userHelpers.cartCount(userData);
    res.render("user/orderConformation", {
      header: "Etron Bay",
      loggedinStatus: req.session.userloggedIn,
      userData,
      cartCount,
      wishListCount,
      orderInfo,
    });
  }
});

router.get("/viewOrders", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cartCount = await userHelpers.cartCount(userData);
    await userHelpers.getUserOrders(userData).then(async (orders) => {
      let len = orders.length - 1;

      let prodsInOrder = await userHelpers.getProdsInOrder(orders[len]._id);
      let order = orders[len];
      console.log("prodsinorder", prodsInOrder);

      res.render("user/viewOrders", {
        loggedinStatus: req.session.userloggedIn,
        userData,
        prodsInOrder,
        cartCount,
        wishListCount,
        order,
      });
    });
  }
});

router.get("/Profile", async (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    let wishListCount = await userHelpers.wihslistCount(userId);
    let cartCount = await userHelpers.cartCount(userId);
    let userAdd = await userHelpers.getUserAddress(userId);
    console.log("asdfgh", userAdd);
    userHelpers.profileData(userId).then((data) => {
      res.render("user/profile", {
        loggedinStatus: req.session.userloggedIn,
        data,
        cartCount,
        wishListCount,
        userAdd,
      });
    });
  }
});
router.get("/editAddress/", async (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    req.session.editAddressId = req.query.addressId;
    editAddress = await userHelpers.getEditAddress(userId, req.query.addressId);
    console.log("qwerty", editAddress);
    res.render("user/editAddress", {
      loggedinStatus: req.session.userloggedIn,
      editAddress,
    });
  }
});

router.post("/profileEditSubmit", (req, res) => {
  if (req.session.userloggedIn) {
    console.log("form ", req.body);
    userId = req.session.user;
    if (req.files) {
      userHelpers.profileUpdate(userId, req.body).then((data) => {
        let userImage = req.files.userImage;

        userImage.mv("./public/products/" + userId + "__dp.jpg");
        res.redirect("/profile");
      });
    } else {
      userHelpers.profileUpdate(userId, req.body).then((data) => {
        res.redirect("/profile");
      });
    }
  }
});

router.post("/profileAddressSubmit", (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    userHelpers.addAddress(req.body, userId).then((response) => {
      console.log(response, "noway home");
      res.json(response);
    });
  }
});
router.post("/editAddressSubmit", (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    userHelpers
      .editAddressSubmit(userId, req.session.editAddressId, req.body)
      .then(() => {
        res.redirect("/Profile");
      });
  }
});
router.post("/verifyPassword", (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    userHelpers.verifyPassword(userId, req.body).then((response) => {
      res.json(response);
    });
  }
});
router.post("/updatePassSubmit", (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    userHelpers.updatePassword(userId, req.body).then((response) => {
      res.json(response);
    });
  }
});

router.get("/buyNowCheckOut/", async (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    id = req.query.id;
    let wishListCount = await userHelpers.wihslistCount(userId);
    let userData = await userHelpers.getUserAddress(userId);
    let cartCount = await userHelpers.cartCount(userId);

    await userHelpers.buynow(id).then((data) => {
      console.log("add", data);
      res.render("user/buyNowCheckOut", {
        loggedinStatus: req.session.userloggedIn,
        data,
        cartCount,
        wishListCount,
        id,
        userData,
      });
    });
    req.session.guestToBuyNow = false;
  } else {
    res.redirect("/loginform");
  }
});

router.post("/buyNowPlaceOrder", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    req.session.refId = uuidv4();
    req.session.buyNoworderData = req.body;
    req.session.buyNowProdId = req.body.prodId;

    let product = await userHelpers.buyNowProduct(req.body.prodId);

    if (req.body.paymentMode === "COD") {
      await userHelpers
        .buyNowPlaceOrder(req.body, userData, product)
        .then(() => {
          res.json({ codSuccess: true });
          productHelpers.buyNowStockUpdate(req.body.prodId);
        });
    } else if (req.body.paymentMode === "Razorpay") {
      if (req.body.hidden) {
        userHelpers
          .generateRazorPay(req.session.refId, req.body.hidden)
          .then((response) => {
            res.json(response);
          });
      } else {
        userHelpers
          .generateRazorPay(req.session.refId, product.price)
          .then((response) => {
            res.json(response);
          });
      }
    } else if (req.body.paymentMode === "Paypal") {
      let product = await userHelpers.buyNowProduct(req.session.buyNowProdId);
      console.log("body thane", req.body);
      userHelpers
        .generatePaypal(req.session.refId, req.body.usdToInr)
        .then((paySuccess) => {
          userHelpers
            .buyNowPlaceOrder(req.body, userData, product)
            .then((orderId) => {
              // req.session.orderId = orderId

              productHelpers
                .buyNowStockUpdate(req.session.buyNowProdId)
                .then(() => {
                  req.session.prod = false;
                  req.session.refId = false;
                  req.session.orderData = false;
                  res.json(paySuccess);
                });
            });
        })
        .catch((err) => {
          console.log("PayPal Err:", err);
        });
    }
  } else {
    res.redirect("/");
  }
});

router.get("/razorpayBuyNowPlaceOrder", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    let product = await userHelpers.buyNowProduct(req.session.buyNowProdId);
    console.log("buynowprod", product);
    userHelpers
      .razorpayBuyNowPlaceOrder(req.session.buyNoworderData, product, userData)
      .then(() => {
        // req.session.orderId = orderId

        productHelpers.buyNowStockUpdate(req.session.buyNowProdId).then(() => {
          req.session.buyNoworderData = false;
          req.session.buyNowProdId = false;
          req.session.refId = false;
          res.redirect("/orderConformation");
        });
      });
  } else {
    res.redirect("/");
  }
});

router.get("/orders", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    let cartCount = await userHelpers.cartCount(userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    await productHelpers.getAllOrders(userData).then((obj) => {
      res.render("user/allOrders1", {
        loggedinStatus: true,
        obj,
        cartCount,
        wishListCount,
      });
    });
  }
});

// router.get("/orderproducts/", async (req, res) => {
//   if (req.session.userloggedIn) {
//     id = req.query.id;
//     let ordermethod = await userHelpers.paymentModeCheck(id);
//     console.log("order", ordermethod);
//     if (ordermethod.mode == "buynow") {
//       console.log("buy noe");
//       res.render("user/orderProducts", { loggedinStatus: true, ordermethod });
//     } else if (ordermethod.mode == "cart") {
//       console.log("cart");
//       await userHelpers.getUserOrdersAdmin(id).then(async (orders) => {
//         let products = await userHelpers.getProdsInOrder(id);
//         console.log("order", orders, "  ", products);

//         res.render("user/orderProducts", {
//           loggedinStatus: true,
//           orders,
//           products,
//         });
//       });
//     }
//   }
// });

router.get("/cancelProductBuyNow/", (req, res) => {
  orderId = req.query.orderId;

  userHelpers.cancelBuyNowProduct(orderId).then((response) => {
    res.redirect("/orders");
  });
});

router.get("/cancelCartProduct/", (req, res) => {
  orderId = req.query.orderId;
  prodId = req.query.prodId;
  qty = req.query.qty;
  console.log("quantity", qty);

  userHelpers.cancelCartProduct(orderId, prodId, qty).then((response) => {
    res.redirect("/orders");
  });
});

router.get("/generateInvoice/", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    orderId = req.query.orderId;
    prodId = req.query.prodId;
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cartCount = await userHelpers.cartCount(userData);
    let orderDetails = await userHelpers.paymentModeCheck(orderId);
    let productDetails = await productHelpers.getProduct(prodId);

    if (orderDetails.mode == "buynow") {
      console.log("orderdetails", orderDetails, "prod", productDetails);
      res.render("user/generateInvoice", {
        loggedinStatus: true,
        orderDetails,
        wishListCount,
        productDetails,
        cartCount,
      });
    } else {
      var cartData = await productHelpers.cartProductInvoice(orderId, prodId);
      console.log("cartdata", cartData);
      res.render("user/generateInvoice", {
        loggedinStatus: true,
        cartData,
        cartCount,
        wishListCount,
      });
      console.log("cart");
    }
  }
});

router.get("/couponElgibility/", (req, res) => {
  if (req.session.userloggedIn) {
    let userId = req.session.user;
    couponCode = req.query.couponCode;
    price = req.query.price;

    userHelpers.couponElgibility(couponCode, price, userId).then((obj) => {
      if (obj.status == false) {
        res.json(obj.status);
      } else if (obj.status == true) {
        console.log(obj);
        res.json(obj);
      } else {
        console.log("invalid");
        res.json(obj.status);
      }
    });
  }
});
router.get("/deleteAddress/", (req, res) => {
  if (req.session.userloggedIn) {
    let userId = req.session.user;
    id = req.query.addressId;
    console.log("address", id);
    userHelpers.deleteAddress(id, userId).then(() => {
      res.redirect("/profile");
    });
  }
});

router.post("/search", async (req, res) => {
  if (req.session.userloggedIn) {
    userData = req.session.user;
    let cartCount = await userHelpers.cartCount(userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    var searchResult = await userHelpers.findSearch(req.body.key);
    res.render("user/searchResult", {
      loggedinStatus: req.session.userloggedIn,
      searchResult,
      cartCount,
      wishListCount,
    });
  } else {
    var searchResult = await userHelpers.findSearch(req.body.key);
    res.render("user/searchResult", { guestHome: true, searchResult });
  }
});

router.post("/currencycoverter/:amount", async (req, res) => {
  await userHelpers.convertAmount(req.params.amount).then((total) => {
    console.log("total", total);
    res.json(total);
  });
});
router.get("/wishlist", async (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    let wishListCount = await userHelpers.wihslistCount(userId);
    let cartCount = await userHelpers.cartCount(userId);
    let wishList = await userHelpers.getWishList(userId);
    let cartProducts = await userHelpers.getCartProducts(userId);
    res.render("user/wishlist", {
      header: "EtronBay",
      loggedinStatus: req.session.userloggedIn,
      wishList,
      cartCount,
      wishListCount,
      cartProducts,
    });
  }
});
router.get("/addToWishList", (req, res) => {
  if (req.session.userloggedIn) {
    userId = req.session.user;
    userHelpers.addToWishList(req.query.prodId, userId).then((response) => {
      res.json(response);
    });
  }
});
router.get("/addToWishListCart/", (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;
    userHelpers.addToWishListCart(userData, req.query.prodId).then(() => {
      res.json(response);
    });
  }
});
router.get("/removeFromWishList/", (req, res) => {
  if (req.session.userloggedIn) {
    let userId = req.session.user;
    userHelpers
      .removeFromWishList(req.query.prodId, userId)
      .then((response) => {
        res.json(response);
      });
  }
});
router.get("/singleProdGuest/", async (req, res) => {
  let data = await productHelpers.singleView(req.query.id);
  console.log("single data", data);
  res.render("user/singleProd", { guestHome: true, data });
});

router.get("/shopByCategory", async (req, res) => {
  if (req.session.userloggedIn) {
    let userId = req.session.user;

    let cartCount = await userHelpers.cartCount(userId);
    let wishListCount = await userHelpers.wihslistCount(userId);

    category = await productHelpers.getCat_Brands();
    res.render("user/shopByCategory", {
      loggedinStatus: req.session.userloggedIn,
      category,
      cartCount,
      wishListCount,
    });
  } else {
    category = await productHelpers.getCat_Brands();
    res.render("user/shopByCategory", {
      loggedinStatus: req.session.userloggedIn,
      category,
      guestHome: true,
    });
  }
});
router.get("/categoryProducts/", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;

    let cartCount = await userHelpers.cartCount(userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    let cart = await userHelpers.getCartProducts(userData);
    products = await productHelpers.getCategoryProd(req.query.catName);
    res.render("user/categoryProducts", {
      loggedinStatus: req.session.userloggedIn,
      products,
      cart,
      cartCount,
      wishListCount,
      category: req.query.catName,
    });
  } else {
    console.log("no session");
    products = await productHelpers.getCategoryProd(req.query.catName);
    res.render("user/categoryProducts", {
      products,
      guestHome: true,
      category: req.query.catName,
    });
  }
});
router.get("/shopByBrand", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;

    let cartCount = await userHelpers.cartCount(userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    brand = await productHelpers.getCat_Brands();
    res.render("user/shopByBrand", {
      loggedinStatus: req.session.userloggedIn,
      brand,
      cartCount,
      wishListCount,
    });
  } else {
    brand = await productHelpers.getCat_Brands();
    res.render("user/shopByBrand", { guestHome: true, brand });
  }
});
router.get("/brandProducts/", async (req, res) => {
  if (req.session.userloggedIn) {
    let userData = req.session.user;

    let cartCount = await userHelpers.cartCount(userData);
    let wishListCount = await userHelpers.wihslistCount(userData);
    brand = await productHelpers.getCat_Brands();
    let cart = await userHelpers.getCartProducts(userData);
    products = await productHelpers.getBrandProd(req.query.brandName);
    res.render("user/brandProducts", {
      loggedinStatus: req.session.userloggedIn,
      products,
      cart,
      cartCount,
      wishListCount,
      brand: req.query.brandName,
    });
  } else {
    products = await productHelpers.getBrandProd(req.query.brandName);
    res.render("user/brandProducts", {
      guestHome: true,
      products,
      brand: req.query.brandName,
    });
  }
}),
  router.get("/offerZone", async (req, res) => {
    if (req.session.userloggedIn) {
      let userData = req.session.user;
      let cartCount = await userHelpers.cartCount(userData);
      let wishListCount = await userHelpers.wihslistCount(userData);
      products = await productHelpers.getAllOfferProd();
      res.render("user/offerZone", {
        loggedinStatus: req.session.userloggedIn,
        cartCount,
        wishListCount,
        products,
      });
    } else {
      products = await productHelpers.getAllOfferProd();
      res.render("user/offerZone", { guestHome: true, products });
    }
  });

module.exports = router;
