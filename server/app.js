/**
 * Created by Abhinav on 05-03-2017.
 */
var express = require('express');
var fs = require('fs');
var async=require('async');
var MongoClient = require('mongodb').MongoClient;
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var type = require('type-of-is');
var base64url = require('base64-url');
var request = require('request');
var cheerio = require('cheerio');
var historyid;
// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
var SCOPES = ['https://mail.google.com'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';
var HISTORY_PATH = TOKEN_DIR + 'History_id.txt';
var gcredentials="";
var movielink="http://www.imdb.com";

var app=express();
app.listen(3000);
var url = 'mongodb://localhost:27017/automated';
// Use connect method to connect to the Server
var db;
    MongoClient.connect(url, function (err, dbs) {
        if(err){
            console.log("error connecting the database");
            return;
        }
        else{
        console.log("Connected correctly to server");
        db=dbs;}
    });

app.get('/users/google/callback', function(req, res) {
    console.log(req.query.code);
    res.end("");
});

fs.readFile('../client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Gmail API.
    gcredentials=JSON.parse(content);
    authorize(JSON.parse(content), start);
});


// Load client secrets from a local file.

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials,callback) {

    var clientSecret = credentials.web.client_secret;
    var clientId = credentials.web.client_id;
    var redirectUrl = credentials.web.redirect_uris[0];

    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    google.options({
        auth: oauth2Client
    });

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client,list);
        }
    });
}


/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */

function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code that appears here and press enter: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client,list);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}
function storehistoryid(token) {
    try {
        fs.mkdirSync(HISTORY_PATH);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(HISTORY_PATH, JSON.stringify(token));
   // console.log('Token stored to ' + HISTORY_PATH);
}


function start(auth,list){
    fs.readFile(HISTORY_PATH,function(err, hId) {
        if (err) {
            console.log(err);
        } else {
            historyid=JSON.parse(hId);

            list(auth,getmessage);
        }
    });

}

function list(auth,getmessage){
    console.log(historyid);
    var gmail = google.gmail('v1');
    gmail.users.history.list({
        auth: auth,
        userId: 'me',
        startHistoryId: historyid,
        historyTypes:'messageAdded',
        labelId:'INBOX'


    },  function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            getNewToken(auth,start);

          /* auth.refreshAccessToken(function(err, tokens) {
           storeToken(tokens)
           });*/
        }
        else{
        try
        {var id = response.history;
            historyid=response.historyId;
            storehistoryid(historyid);
           // console.log(response);
            console.log(id.length);
            for(var i=0;id[i];i++){
                // console.log(id[i].messages[0].id);

               // async.waterfall([getmessage(id[i].messages[0].id,auth,gmail,send),send(subject,gmail,auth,mailto,body)]);
                getmessage(id[i].messages[0].id,auth,gmail,makesubject);
                if(i==id.length-1){
                setTimeout(function (auth){
                    list(auth,getmessage);
                },5000);}
            }
        }
        catch(err) {
            //console.log(collection);
            console.log("no new messages");
            setTimeout(function (auth){
            list(auth,getmessage);
        },10000);}}
    });

}

function getmessage(id,auth,gmail,makesubject) {console.log(id);
    gmail.users.messages.get({
        auth: auth,
        userId: 'me',
        id: id,
    },function (err,response){
        if (err){console.log("here take a error:"+err);
            return;}
        else
        {   for(var i=0;response.payload.headers[i];i++){
            if(response.payload.headers[i].name=="From"){
                var mailto=response.payload.headers[i].value;
                console.log(mailto);}
            else if(response.payload.headers[i].name=="Subject")
                var inputsubject=response.payload.headers[i].value;
        }
            var inputbody=response.payload.parts[0].body.data;
            inputbody =base64url.unescape(inputbody);
            inputbody=base64url.decode(inputbody);
            if(inputbody.lastIndexOf("\n")>0) {
                inputbody= inputbody.substring(0, inputbody.lastIndexOf("\n"));
               // inputbody=inputbody.replace(/\s/g,'').toLowerCase();
            }
            makesubject(auth,gmail,mailto,inputsubject,inputbody,send);
            }

    })
return;
}
function makesubject(auth,gmail,mailto,inputsubject,inputbody,send){
    console.log(inputbody);

    //console.log(mailto,inputsubject);
    var subject;
    var body="Subject or query is invalid.";
    if(inputsubject.replace(/\s/g,'').toLowerCase()=="database") {
        //setTimeout(function(){subject="Here is the requested query";},500);
        var collection = db.collection("dishes");
        var search = inputbody.split('\n')[0].replace(/\s/g, '').toLowerCase();
        if (!inputbody.split('\n')[1]) {
            body = "No information to search was given in 2nd line.\nThis was an invalid query for a valid query please refer to the instructions below:";
            subject = "No information to search.";
            send(subject, gmail, auth, mailto, body);

        }
        else {
            inputbody = inputbody.split('\n')[1].toLowerCase();
            if (search == "firstname") {
                inputbody = inputbody.replace(/\s/g, '');
                console.log("required by firstname");
                collection.find({firstname: inputbody}).toArray(function (err, docs) {
                    body = "No entry with this detail in the database";
                    subject = "Here is the requested query";
                    for (var i = 0; docs[i]; i++) {
                        if(i==0) body="";
                        // body.concat(docs[i].name)
                        body = body + (i + 1) + ".<br>";
                        body = body + "Name:" + docs[i].firstname + " " + docs[i].lastname + "<br>";
                        body = body + "Phone no:" + docs[i].phoneno + "<br>";
                        body = body + "Id:" + docs[i]._id + "<br><hr>";
                        //console.log(docs[i].name);
                    }

                    send(subject, gmail, auth, mailto, body);
                });

            }
            else if (search == "lastname") {
                inputbody = inputbody.replace(/\s/g, '');
                console.log("required by lastname");
                collection.find({lastname: inputbody}).toArray(function (err, docs) {
                    body = "NO entry with this detail in the database";
                    subject = "Here is the requested query";
                    for (var i = 0; docs[i]; i++) {
                        if(i==0)
                            body="";
                        // body.concat(docs[i].name)
                        body = body + (i + 1) + ".<br>";
                        body = body + "Name:" + docs[i].firstname + " " + docs[i].lastname + "<br>";
                        body = body + "Phone no:" + docs[i].phoneno + "<br>";
                        body = body + "Id:" + docs[i]._id + "<br><hr>";
                        //console.log(docs[i].name);
                    }

                    send(subject, gmail, auth, mailto, body);
                });

            }
            else if (search == "phoneno") {
                inputbody = inputbody.replace(/\s/g, '');
                console.log("required by phoneno");
                collection.find({phoneno: inputbody}).toArray(function (err, docs) {
                    body = "NO entry with this detail in the database";
                    subject = "Here is the requested query";
                    for (var i = 0; docs[i]; i++) {
                        if(i==0)
                            body="";
                        // body.concat(docs[i].name)
                        body = body + (i + 1) + ".<br>";
                        body = body + "Name:" + docs[i].firstname + " " + docs[i].lastname + "<br>";
                        body = body + "Phone no:" + docs[i].phoneno + "<br>";
                        body = body + "Id:" + docs[i]._id + "<br><hr>";
                        //console.log(docs[i].name);
                    }

                    send(subject, gmail, auth, mailto, body);
                });

            }
            else if (search == "name") {
                console.log("required by name");
                var firstname = inputbody.split(' ')[0].replace(/\s/g, '');
                var lastname = inputbody.split(' ')[1].replace(/\s/g, '');
                console.log(firstname + "\n" + lastname);
                collection.find({
                    firstname: firstname,
                    lastname: lastname
                }).toArray(function (err, docs) {
                    body = "NO entry with this detail in the database";
                    subject = "Here is the requested query";
                    for (var i = 0; docs[i]; i++) {
                        if(i==0)
                            body="";
                        // body.concat(docs[i].name)
                        body = body + (i + 1) + ".<br>";
                        body = body + "Name:" + docs[i].firstname + " " + docs[i].lastname + "<br>";
                        body = body + "Phone no:" + docs[i].phoneno + "<br>";
                        body = body + "Id:" + docs[i]._id + "<br><hr>";
                        //console.log(docs[i].name);
                    }

                    send(subject, gmail, auth, mailto, body);
                });
            }
            else {
                subject = "Invalid Query!!";
                body = "This was an invalid query.\nFor a valid query please refer to the instructions below:";
                send(subject, gmail, auth, mailto, body);
            }
        }}
        else if(inputsubject.replace(/\s/g,'').toLowerCase()=="movie") {
        inputbody = inputbody.split('\n')[0].toLowerCase();
        url = 'http://www.imdb.com/find?ref_=nv_sr_fn&q='+inputbody+'&s=all';
        body = "";
        subject = "Here is the requested query";
        var data=[];
        request(url, function(error, response, html){
            if(!error){
                var $ = cheerio.load(html);

                var title, link;

                $('.result_text a').each(function(i, elem){
                    data[i]= $(this);
                });
                title = data[0].text();
                link=   data[0].attr("href");
                link=movielink+link;

            }
            console.log(link);
            request(link, function(err, resp, htm){
                if(!error){
                    var $ = cheerio.load(htm);
                    var data1,data2;
                    $('.title_wrapper').each(function(i, elem){
                        data[i]= $(this);
                    });
                    $('.ratingValue').filter(function(){
                        data1 = $(this);
                    });
                    $('.plot_summary').filter(function(){
                        data2 = $(this);
                    });
                    body=data[0].html();
                    body=body+data1.html();
                    body=body+data2.html();
                    body=body.replace(/href="/g,'href="http://www.imdb.com');
                    console.log(body);
                    send(subject, gmail, auth, mailto, body);

                }

            })
        })
    }
    else
        {
            subject = "Invalid Query!!";
            body = "This was an invalid query for a valid query please refer to the instructions below:";
            send(subject, gmail, auth, mailto, body);
        }

    }

//function yo(subject,gmail,auth,mailto,body){console.log(subject);};
function send(subject,gmail,auth,mailto,body) { var string="To:"+mailto+"\n" +
    "From:Automated bot <automatedquery@gmail.com>\n"+
    "Content-type: text/html;charset=UTF-8\n"+
    "MIME-Version: 1.0\n"+
    "Subject:"+subject+"\n\n"+
    "<html><h2><B>"+body+"</B></h2></html>\n";

    var r=base64url.escape(base64url.encode(string));
    console.log(r);
    gmail.users.messages.send({
        auth: auth,
        userId: 'me',
        resource: {raw:r}}
    )}
/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels1(auth) {
    var gmail = google.gmail('v1');
    gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        maxResults: 5,
        labelIds: "INBOX"


    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var id = response.messages;
        {
            console.log(id);
            getmessage(id[0].id,auth,gmail);
        }
    });
}

