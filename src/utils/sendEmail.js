require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const fs = require("fs-extra");
const path = require("path");
const Handlebars = require("handlebars");
const { formatPrice } = require("./formatOrderData");
const {
  EMAIL_OAUTH_CLIENT_ID,
  EMAIL_CLIENT_SECRET,
  REDIRECT_URI,
  REFRESH_TOKEN,
  EMAIL_EPROVIDER,
} = process.env;

const oAuth2Client = new google.auth.OAuth2(
  EMAIL_OAUTH_CLIENT_ID,
  EMAIL_CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

Handlebars.registerHelper("formatPrice", function (price) {
  if (!price) return "---";
  const p = price.toString();
  let int = p.split(".")[0];
  if (int.length > 3) {
    int = int.slice(0, -3) + "." + int.slice(-3);
  }
  return int;
});

Handlebars.registerHelper("finalPrice", function (price, sale_price) {
  if (sale_price !== price && sale_price !== 0) {
    return formatPrice(sale_price).int.toString();
  } else {
    return formatPrice(price).int.toString();
  }
});

Handlebars.registerHelper("quantity", function (quantity) {
  if (quantity > 1) {
    return quantity + "x";
  }
});

const sendEmail = async (email, subject, templateUrl, variables) => {
  try {
    const filePath = path.join(__dirname, templateUrl);
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source);
    const html = template(variables);

    const accessToken = await oAuth2Client.getAccessToken();
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: EMAIL_EPROVIDER,
        clientId: EMAIL_OAUTH_CLIENT_ID,
        clientSecret: EMAIL_CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: `Provider <${EMAIL_EPROVIDER}>`,
      to: email,
      subject,
      html,
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = sendEmail;
