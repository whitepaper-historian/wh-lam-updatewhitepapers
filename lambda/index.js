/*
Pseudocode:

1. Pull latest content on https://aws.amazon.com/whitepapers/
2. Parse through content for each block corresponding to an individual whitepaper
3. For each block found:
3a. Get whitepaper title, store in row
3b. Get whitepaper date, store in row
3c. Get PDF Link, store in row
3d. Get Kindle Link (if it exists), store in row

Tools:

CheerioJS: https://github.com/cheeriojs/cheerio

Code Source: https://scotch.io/tutorials/scraping-the-web-with-node-js


*/

// Hashing function grabbed from https://stackoverflow.com/a/8831937
var hashCode = function(value) {
    var hash = 0;
    if (value.length == 0) {
        return hash;
    }
    for (var i = 0; i < value.length; i++) {
        var char = value.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

//var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
//var app     = express();

exports.handler = function(event, context, callback){

    var url = 'https://aws.amazon.com/whitepapers/';

    // The structure of our request call
    // The first parameter is our URL
    // The callback function takes 3 parameters, an error, response status code and the html

    request(url, function(error, response, html){

        // First we'll check to make sure no errors occurred when making the request

        var params;
        var unfiltered_whitepapers = [];

        if(!error){
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

            var $ = cheerio.load(html);

            // Finally, we'll define the variables we're going to capture and an array to store the results

            var title,updated,pdf_link,kindle_link;
            params = {
                RequestItems: {
                    'whitepapers' : []
                }
            };

            $('.aws-text-box.section').each(function(i, elem){
                var data = $(this);
                var jsonobj = { 
                    PutRequest: {
                        Item: {
                            //uid : "", title : "", updated : "", pdf_link : "", kindle_link : ""
                        }
                    }
                };
                
                title = "";
                updated = "";
                pdf_link = "";
                kindle_link = "";

                var box = data.children().first().children().first().children().first();

                title = box.children('b').text();
                var dateraw = box.text();
                var myRe = /[a-zA-Z]{3,9}\s\d{4}\)/g;
                var dateparsed = myRe.exec(dateraw);
                if(dateparsed) {
                  var re = /\)/g;
                  updated = dateparsed[0].replace(re,'');
                }
                //pdf_link = box.find('a').attr('href');
                box.find('a').each(function(){
                    if($(this).text().trim() === 'PDF')
                        pdf_link = $(this).attr('href');
                    if($(this).text().trim() === 'Kindle')
                        kindle_link = $(this).attr('href');
                })
                
                

                if(pdf_link) {
                    // Make sure the link has the https protocol specified.
                    // This specifically accounts for the Amazon Whitepapers page which seems to only have links starting with //.
                    if(pdf_link.substring(0,2) === '//')
                        pdf_link = 'https:' + pdf_link;
                    
                    jsonobj.PutRequest.Item.pdf_link = pdf_link;
                }
                
                if(kindle_link) {
                    // Make sure the link has the https protocol specified.
                    // This specifically accounts for the Amazon Whitepapers page which seems to only have links starting with //.
                    if(kindle_link.substring(0,2) === '//')
                        kindle_link = 'https:' + kindle_link;
                    
                    jsonobj.PutRequest.Item.kindle_link = kindle_link;
                }
                
                if(title && updated) {
                    // Clean up whitespace to ensure consistency
                    title = title.trim();
                    updated = updated.trim();
                    
                    jsonobj.PutRequest.Item.title = title;
                    jsonobj.PutRequest.Item.updated = updated;
                    var uid_raw = title + updated;
                    jsonobj.PutRequest.Item.uid = hashCode(uid_raw).toString(16);
                    unfiltered_whitepapers.push(jsonobj);
                }
            });
        }
        else {
                console.err("PARAM GEN FAILURE");
        }
        
        var filtered_whitepapers = [];
        // There should be at least one result
        filtered_whitepapers.push(unfiltered_whitepapers[0]);
        //Scan array for duplicate entries in whitepapers page
        toploop:
        for(var i = 1; i < unfiltered_whitepapers.length; i++) {
            for(var j = 0; j < filtered_whitepapers.length; j++) {
                if(unfiltered_whitepapers[i].PutRequest.Item.uid === filtered_whitepapers[j].PutRequest.Item.uid)
                    continue toploop;
            }

            //Value was not found in unfiltered list
            filtered_whitepapers.push(unfiltered_whitepapers[i]);
        }
        params.RequestItems['whitepapers'] = filtered_whitepapers.splice();
        
        var split_whitepapers = new Array([]);
        var j = 0;
        var k = -1;
        //Split the whitepapers up into 25 count chunks due to dynamoDB limitations
        for(var i = 0; i < filtered_whitepapers.length; i++) {
            if(i%25 == 0) {
                j = 0;
                k = k+1;
                split_whitepapers[k] = [];
            }
            
            split_whitepapers[k][j] = filtered_whitepapers[i];
            
            j = j+1;
        }

        if(params) {
            split_whitepapers.forEach(function(sublist) {
                params.RequestItems['whitepapers'] = sublist;
                // Add data to dynamoDB
                const AWS = require('aws-sdk');
    
                const ddb = new AWS.DynamoDB.DocumentClient();
                
                //console.log(params);
                //console.log(sublist.length);
                //console.log("params length: " + params.RequestItems.whitepapers.length);
    
                ddb.batchWrite(params, function(err, data) {
                  if (err) console.log(err);
                  else console.log(data);
                }).promise();
            });
        }
        else {
            console.err("NO PARAMS");
        }

    });
};
