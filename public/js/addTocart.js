const { cartCount } = require("../helpers/userHelpers");

function addToCart(prodId, price) {
  $.ajax({
    url: "/addToCart/" + prodId + "/" + price,
    method: "get",
    success: (response) => {
      if (response.status) {
        let count = $("#cartCount").html();
        count = parseInt(count) + 1;
        $("#cartCount").html(count);
        alertify.success("Added To Cart");
        setTimeout(function () {
          location.reload();
        },500);

        // Swal.fire({
        //   position: 'center',
        //   icon: 'success',
        //   title: 'Item Added to Cart',
        //   showConfirmButton: false,
        //   timer: 1000
        // }).then(()=>{
        //   location.reload()
        // })
      }
    },
  });
}
