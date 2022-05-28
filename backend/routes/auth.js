const express = require("express");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
let saltRounds = 10;
var fetchuser = require("../middleware/fetchuser");
const { authToken, genToken } = require("../middleware/authorization_jwt");
//ROUTE 1: Create a user using: POST "/api/auth/createuser". No login required.
router.post(
  "/createuser",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password must be atleast 5 characters").isLength({
      min: 6,
    }),
  ],
  async (req, res) => {
    // If there are errors return bad requests and the errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Check whether the email exists already'
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res
          .status(400)
          .json({ error: "Sorry a user with this email already exists" });
      }

      let securedPassword = await bcrypt.hash(req.body.password, saltRounds);

      // Create a new user
      user = await User.create({
        email: req.body.email,
        password: securedPassword,
        role: req.body.role,
      });

      const data = {
        user: {
          id: user.id,
        },
      };

      const auth_token = jwt.sign(data, "abcd");
      console.log(auth_token);

      const role = user.role;
      res.json({ auth_token, role });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Some error occurred");
    }
  }
);

//ROUTE 2: Authenticate a user using: POST "/api/auth/login". No login required.
router.post(
  "/login",
  [
    body("email", "Enter a valid email").isEmail(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    // If there are errors return bad requests and the errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ error: "Please try to login with correct credentials" });
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res
          .status(400)
          .json({ error: "Please try to login with correct credentials" });
      }

      const payload = {
        user: {
          id: user.id,
        },
      };

      const role = user.role;
      const authToken = jwt.sign(payload, "abcd");
      console.log(authToken);

      res.json({ authToken, role });
    } catch (error) {
      console.error(error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);

// ROUTE 3: Get logged in user details using POST "/api/auth/getuser". No login required.
router.post("/getuser", fetchuser, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});
module.exports = router;
