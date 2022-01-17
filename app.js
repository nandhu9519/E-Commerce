var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var hbs = require("express-handlebars");
var session = require("express-session");
const fileUpload = require("express-fileupload");
var helpers = require("handlebars-helpers")();
var Handlebars = require("handlebars");
require('dotenv').config()
const db = require("./config/connections");

var userRouter = require("./routes/user");
var adminRouter = require("./routes/admin");
const otpkeys = require("./config/otpkeys");
const { handlebars } = require("hbs");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.engine(
  "hbs",
  hbs({
    extname: "hbs",
    defaultLayout: "layout",
    layoutsDir: __dirname + "/views/layout",
    partialsDir: __dirname + "/views/partials",
  })
);
const oneday = 1000 * 60 * 60 * 24;
//session
app.use(
  session({
    secret: "user",
    saveUninitialized: true,
    cookie: { maxAge: oneday },
    resave: false,
  })
);

app.use(fileUpload());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// database connecetion
db.connect((err) => {
  if (err) console.log("Connection error" + err);
  else console.log("Database connected to port 27017");
});

app.use("/", userRouter);
app.use("/admin", adminRouter);

Handlebars.registerHelper("hello", function (context, options, price, name) {
  for (key in context) {
    if (options.toString() == context[key].item.toString()) {
      var inp = true;
      break;
    } else {
      var inp = false;
    }
  }
  if (inp === true) {
    var data =
      '<a href="/cart" class="btn btn-primary add-to-cart"> View Cart</a>';
  } else {
    var data = `<a class="btn btn-primary add-to-cart" onclick="addToCart('${options}','${price}')">Add To Cart</a>`;
  }
  return data;
});

Handlebars.registerHelper("wishlistUpdate", (wishList, prodId) => {
  var exist;

  if (wishList == null) {
    var btn;
    btn = `<a class="wishOn" style=" width: 20px; border: white " onclick="addTowishList('${prodId}')"><i class="far fa-heart" style="color:red"></i></a>`;
    return btn;
  } else if (wishList.productInfo.length > 0) {
    console.log("true");
    for (key in wishList.productInfo) {
      if (wishList.productInfo[key].prodId.toString() == prodId.toString()) {
        exist = true;
        break;
      } else {
        exist = false;
      }
    }
    var btn;
    if (exist == true) {
      btn = `<a class="wishOn" style="width: 20px; background-colour:red" onclick=" removeFromWish('${prodId}')"><i class="fas fa-heart" style="color:red"></i></i>
    </a>`;
    } else {
      btn = `<a class="wishOn" style=" width: 20px; border: white " onclick="addTowishList('${prodId}')"><i class="far fa-heart" style="color:red"></i></a>`;
    }
    return btn;
  }
});
Handlebars.registerHelper("wishlist", (cartProducts, prodId) => {
  var exist;
  console.log("helpers", cartProducts);
  if (cartProducts.length > 0)
    for (key in cartProducts) {
      if (cartProducts[key].item.toString() == prodId.toString()) {
        exist = true;
        break;
      } else {
        exist = false;
      }
    }
  var btn;
  if (exist == true) {
    btn = `<a href="/cart" class="text-dark"><i class="fa fa-cart-plus" aria-hidden="true"></i> View Cart</a>`;
  } else {
    btn = `<a href="#" class="text-dark"
    onclick="addToWishListCart('${prodId}')"><i class="fa fa-cart-plus" aria-hidden="true"></i> Add to cart</a>`;
  }
  return btn;
});

Handlebars.registerHelper("checkArrayLengthPDF", function (array) {
  if (array.length >= 1) {
    return (data =
      '<button class="btn btn-success" onclick="getReport()">Download PDF</button>');
  }
});
Handlebars.registerHelper("checkArrayLengthXLS", function (array) {
  if (array.length >= 1) {
    return (data =
      '<button class="btn btn-success" onclick="getspreadSheet()">Download XLS</button>');
  }
});



module.exports = app;
