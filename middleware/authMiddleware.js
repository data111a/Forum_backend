const jwt = require("jsonwebtoken");
const { findUser } = require("../db/dbFuncs");

module.exports = async (req, res, next) => {
  //getting token from header
  const authToken = req.headers.authorization || token;

  //checking if token exists
  if (!authToken) {
    console.log("ak movida");
    return res.sendStatus(401);
  }

  //verifing token
  const data = jwt.verify(authToken, "changeLater");
  //with verified data searching for user with id
  const user = await findUser({ id: data.userID });

  //if user doesnot exist sending false status
  if (!user) {
    return res.sendStatus(401);
  }

  //if user exists setting to req.user for next() and calling it
  req.user = user;
  next();
};
