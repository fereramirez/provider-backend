const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    on_sale: {
      type: Boolean,
      default: false,
    },
    brand: {
      type: String,
      required: true,
    },
    main_features: [String],
    attributes: [
      {
        value_name: String,
        name: String,
      },
    ],
    description: {
      type: String,
      required: true,
    },
    category: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
    },
    path_from_root: [
      {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],
    available_quantity: Number,
    seller: String,
    buyers: [String],
    free_shipping: Boolean,
    images: [
      {
        imgURL: String,
        public_id: String,
      },
    ],
    premium: Boolean,
    premiumData: {
      miniDescription: String,
      color: String,
      video: String,
      textColor: String,
      logo: String,
      carouselImg: [{}],
      extraText: [{}],
    },
    undeletable: {
      type: Boolean,
      default: false,
    },
    comments: [
      {
        user_id: String,
        text: String,
        date: String,
        calification: Number,
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    versionKey: false,
    toJSON: { getters: true, virtuals: true },
    toObject: { getters: true, virtuals: true },
  }
);

productSchema.virtual("sale_price").get(function () {
  return this.price - this.price * (this.discount / 100);
});
productSchema.virtual("thumbnail").get(function () {
  return this.images[0].imgURL;
});
productSchema.virtual("average_calification").get(function () {
  if (this.comments.length === 0) return "0";

  let suma = 0;
  this.comments.forEach((comment) => (suma += comment.calification));
  let promedio = (suma / this.comments.length).toFixed(2);

  return promedio;
});

module.exports = model("Product", productSchema);
