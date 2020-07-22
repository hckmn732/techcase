var express = require('express');
var router = express.Router();

const {google} = require('googleapis')

const oauth2Client = new google.auth.OAuth2(
  "198623772265-a8t87mrre7dbkf2a4pg7csocmvmjde5i.apps.googleusercontent.com",
  "sKnZ2hhH-qb5k6og5ebsbvzc",
  "http://localhost:3000/oauth2callback"
);

const scopes = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

async function gsrun(cl,id_spreadsheet,response){
  try {
    var pushed_key = []
    //create api for google sheet with the oauth2 client
    const gsapi = google.sheets({version:"v4",auth:cl})

    //read all value from tab A
    var opt = {
        spreadsheetId:id_spreadsheet,
        range: 'A'
    }
    let result = await gsapi.spreadsheets.values.get(opt);
    dataArrayA = result.data.values
    
    //read all value from tab A
    var opt = {
        spreadsheetId:id_spreadsheet,
        range: 'B'
    }
    let result2 = await gsapi.spreadsheets.values.get(opt);
    dataArrayB = result2.data.values
  

    lengthColA = dataArrayA[0].length
    lengthColB = dataArrayB[0].length
    
    // set length the same number of column in A & B
    if(lengthColA>lengthColB){
        dataArrayB = (result2.data.values).map(function(data){
            while(data.length < lengthColA){
                data.push('')
            }
            return data;
        })
    }else if(lengthColA<lengthColB){
        dataArrayA = (result.data.values).map(function(data){
            while(data.length < lengthColB){
                data.push('')
            }
            return data;
        })
    }
    
    lengthColA = dataArrayA[0].length
    lengthColB = dataArrayB[0].length
  
    //CREATE KEY TO IDENTIFY UNIQUE INFORMATION : Our key is firstName,lastName and email
    dataArrayA = (result.data.values).map(function(data){
      data.push(data[0]+'-'+data[1]+'-'+data[2]);
      return data;
    })
  
    dataArrayB = (result2.data.values).map(function(r){
      r.push(r[0]+'-'+r[1]+'-'+r[2]);
      return r;
    })

    /* REMOVE DUPLICATES FROM A , THEN FROM B BEFORE PERFORM A MERGE
     THE DEFINE STRATEGY : IN A RECORD TABLE, IF INFORMATION IS DUPLICATE,
        THE MOST RECENT INFORMATION IS MORE RELEVANT. SO WE UPDATE EACH
        DUPLICATE RECORD IN THE TABLE BY THE NEXT DUPLICATED VALUE, ASSUMING THAT
        INFORMATION ARE ORDERED BY ASCENDING OF DATE */
    const tabA = await UpdateTable(dataArrayA);
    const tabB = await UpdateTable(dataArrayB);
  
    lengthRowA = tabA.length
    lengthRowB = tabB.length
  
    var final_data = [];
    
    
    /* NOW, WE KNOW THAT IF A INFORMATION IS IN TABLE A, AND iS IN TABLE B, 
    THE INFORMATION EXIST ONLY ONE TIME IN TABLE B AND TABLE A */
    /* 
      MERGE STRATEGY : DATA FROM TABLE B is higher priority than A
    */
    for (var i = 0; i < lengthRowA; i++) {
      temp_data = []
      var res = await checkDuplicateKey(tabB,tabA[i][lengthColA]);
      if(!res){
        for (var l = 0; l < lengthColA; l++) {
          temp_data.push(tabA[i][l])
        }
      }else{
        for (var l = 0; l < lengthColA; l++) {
          if(tabA[i][l] === tabB[res][l] || tabB[res][l] === ''){
            temp_data.push(tabA[i][l])
          }else if(tabA[i][l] !== tabB[res][l] && tabB[res][l] !==''){
            temp_data.push(tabB[res][l])
          }
        }
      }
      if(!(pushed_key.includes(tabA[i][lengthColA]))){
        pushed_key.push(tabA[i][lengthColA])
      }
      if(temp_data.length > 0){
        final_data.push(temp_data)
      }
    }


    // ADD INFORMATION FROM TABLE B. DUPLICATED INFORMATION ALREADY ADDED
    // SO WE ONLY ADD NOT DUPLICATED INFORMATION
    for (var i = 0; i < lengthRowB; i++) {
      temp_data = []
      if(!(pushed_key.includes(tabB[i][lengthColB]))){
          for (var l = 0; l < lengthRowB; l++) {
              temp_data.push(tabB[i][l])
          }
      }
      if(temp_data.length > 0){
        final_data.push(temp_data)
      }
    }
    
    const updateOptions = {
        spreadsheetId:id_spreadsheet,
        range: 'C!A1',
        valueInputOption:'USER_ENTERED',
        resource:{values:final_data}
    }
    await gsapi.spreadsheets.values.update(updateOptions);
    response.send("ok")
  } catch (error) {
    response.send("error")
  }
}

function UpdateTable(arr) {
  return new Promise((resolve, reject) => {
    to_remove = []
    for (let i = 0; i < arr.length; i++) {
      for (let k = i+1; k < arr.length; k++) {
        if(arr[k][arr[k].length-1] === arr[i][arr[i].length-1]){
          arr[i] = arr[k]
          to_remove.push(k)
        }
      }
    }
    for (let index = 0; index < to_remove.length; index++) {
      arr.splice(to_remove[index], 1);
    }
    resolve(arr)
  })
}


function checkDuplicateKey(arr, search) {

  return new Promise((resolve, reject) => {
    index = false;
    for (let i = 0; i < arr.length; i++) {
      if(arr[i].includes(search)){
        index = i
      }
    }
    resolve(index)
  })
}

function listFiles(auth,response) {
  const drive = google.drive({version: 'v3', auth});
  var files 
  drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet'",
    fields: 'nextPageToken, files(id, name)'
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    files = res.data.files;
    response.render('manage',{ files : files });
  });
}

router.get('/', function(req, res) {
  
  var tokens = req.cookies['token'];
  if (tokens) {
    oauth2Client.setCredentials(tokens)
    //gsrun(oauth2Client);
    listFiles(oauth2Client,res)
  }else{
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
    });
    res.render('index', { url: authorizeUrl });
  }
});

router.get('/logout', function(req, res) {
  res.clearCookie("token");
  res.redirect('/');
});

router.post('/', function(req, res) {
  var tokens = req.cookies['token'];
  if (tokens) {
    oauth2Client.setCredentials(tokens)
    gsrun(oauth2Client,req.body.id_spreadsheet,res);
  }else{
    res.redirect('/');
  }

});

module.exports = router;
