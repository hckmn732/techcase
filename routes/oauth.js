var express = require('express');
var router = express.Router();
const {google} = require('googleapis');
const { Console } = require('console');
const oauth2Client = new google.auth.OAuth2(
  "198623772265-a8t87mrre7dbkf2a4pg7csocmvmjde5i.apps.googleusercontent.com",
  "sKnZ2hhH-qb5k6og5ebsbvzc",
  "http://localhost:3000/oauth2callback"
);

google.options({auth: oauth2Client});

async function handleToken(req,res){
  const {tokens} =  await oauth2Client.getToken(req.query.code)
  res.cookie('token', tokens, { maxAge: 9000000, httpOnly: true });
  res.redirect('/?success=true');
}

router.get('/', async(req, res) => {
  tokens = handleToken(req,res)
})

module.exports = router;
