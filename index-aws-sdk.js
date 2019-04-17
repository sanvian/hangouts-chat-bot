'use strict';

// load AWS SDK module, which is always included in the runtime enviornment
const AWS = require('aws-sdk');

// define our target API as a "service"
const svc = new AWS.Service({
    
    // the API base URL
    endpoint: 'https://jiradev.ert.com/jira/rest/api/2',
    // don't parse API responses
    convertResponseTypes: false,
    
    // and now, our API endpoints
    apiConfig: {
        metadata: {
            protocol: 'rest-json'
        },
        operations: {
            // Get JIRA Ticket details
            getIssue: {
                http: {
                    method: 'GET',
                    requestUri: '/issue/{issueId}'
                },
                input: {
                    type: 'structure',
                    required: [ 'auth', 'issueId'],
                    members: {
                        'auth': {
                            // send authenticaition in the HTTP request header
                            location: 'header',
                            locationName: 'Authorization',
                            sensitive: true
                        },
                        'issueId': {
                            type: 'string',
                            location: 'uri',
                            locationName: 'issueId'
                        }
                    }
                }
            },
            
            createIssue: {
                // create JIRA issue 
                http: {
                    method: 'POST',
                    requestUri: '/issue'
                },
                input: {
                    type: 'structure',
                    required: ['auth', 'contentType','data'],
                    // use "data" input for the request payload
                    payload: 'data',
                    members: {
                        'auth': {
                            location: 'header',
                            locationName: 'Authorization',
                            sensitive: false
                        },
                        'contentType': {
                            location: 'header',
                            locationName: 'Content-Type',
                            sensitive: false
                        },
                        'data': {
                            type: 'structure',
                            required: ['fields'],
                            // the body object
                            members: {
                                'fields': {}
                            }
                        }
                    }
                }
            }
        }
    }
});

// disable AWS region related login in the SDK
svc.isGlobalEndpoint = true;

// and now call our target API
exports.handler = function (event, context, callback) {
    // console.log('Data: ', data);
    console.log("event.body: ", event.body);
    const messageBody = JSON.parse(event.body);
    const messageType = messageBody.type;
    const userDisplayName = messageBody.user.displayName;
    const userEmail = messageBody.user.email;
    const messageArgumentText = messageBody.message.argumentText;
    
    console.log("event.body.type: ", messageType);
    console.log("event.body.user.displayName", userDisplayName);
    console.log("event.body.user.email", userEmail);
    console.log("event.body.message.argumentText: ", messageArgumentText);
    
    // command parser logic
    var messageArguments = messageArgumentText.split("|");
    // remove all the leading and trailing spaces
    messageArguments = messageArguments.map(s => s.trim());
    // first word of messageArgument is command
    const command = messageArguments[0];
    console.log("command: ", command);
    // validate commands
    if (command == "jira-create") {
        processJiraCreate(messageArguments.slice(1), callback);
    }
    else if (command == "jira-get") {
        processJiraGet(messageArguments.slice(1), callback);    
    }
    else {
        greet(userDisplayName, userEmail, callback);
    }
};

function showUsageJiraGet() {
    return "Usage: jira-get | <issue-id>";
}

function showUsageJiraCreate() {
    return "Usage: jira-create | <project-key> | <issue summary> | <issue description> | <issue type>";
}

function greet(userDisplayName, userEmail, callback) {
    let greeting = {};

    // standard greeting
    greeting = "Hello *" + userDisplayName + "*(" + userEmail + ")" + "!\n";
    greeting += "You can use me to *1)* Get summary of an existing JIRA ticket. *2)* Create a new JIRA ticket \n";
    greeting += "`" + showUsageJiraGet() + "`\n";
    greeting += "`" + showUsageJiraCreate() + "`\n";

    sendResponse(greeting, callback);
}

function sendResponse(responseText, callback) {
     const response = {
        statusCode: 200,
        body: JSON.stringify({'text': responseText}),
        isBase64Encoded: false
    };
        
    console.log(response);
    callback(null, response);  
}

function processJiraGet(commandArguments, callback) {
    // check commandArguments lengths need to be 1
    if (commandArguments.length != 1) {
        sendResponse(showUsageJiraGet(), callback);
    }
    
    svc.getIssue({
        auth: 'Basic amlyYWNoYXRib3Q6amlyYWNoYXRib3Q=',
        issueId: commandArguments[0]
    }, (err, data) => {
        if (err) {
            console.error('>>> login error:', err);
            return callback(null, err);
        }
        
        const dataFields = data.fields;
        // console.log(dataFields);
        // console.log("1: ", data.fields['summary']);
        const issueSummary = dataFields.summary;

        sendResponse(issueSummary, callback);
    });
}

function processJiraCreate(commandArguments, callback) {
    // check command length. needs to be 4
    if (commandArguments.length != 4) {
        sendResponse(showUsageJiraCreate(), callback);
    }
    
    const projectKey = commandArguments[0];
    const issueSummary = commandArguments[1];
    const issueDescription = commandArguments[2];
    const issueType = commandArguments[3];
    
    const fieldValues = JSON.stringify({
        "project": {
            "key": projectKey
        },
        "summary": issueSummary,
        "description": issueDescription,
        "issuetype": {
            "name": issueType
        }
    });
    console.log(fieldValues);
    
    svc.createIssue({
        auth: 'Basic amlyYWNoYXRib3Q6amlyYWNoYXRib3Q=',
        contentType: 'application/json',
        data: {
            "fields": fieldValues
        }
    }, (err, data) => {
        if (err) {
            console.log('>>> login error:', err);
            console.log(data);
            return callback(null, err);
        }
        
        console.log(data);
        
        sendResponse("Create Call made", callback);
    });
    
}