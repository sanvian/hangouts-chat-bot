'use strict';

const request = require('request');

const jiraEndpoint = 'https://jiradev.ert.com/jira/rest/api/2';
const jiraUser = 'jirachatbot';
const jiraPassword = 'jirachatbot';

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

    const optionsGetTicketDetails = {
        url: jiraEndpoint + '/issue/' + commandArguments[0],
        auth: {
            username: jiraUser,
            password: jiraPassword
        }
    }
    
    // make GET call
    request.get(optionsGetTicketDetails, function(err, response, body) {
        if (err) {
            console.log("Error: ", err);
            return callback(null, err);
        }
        
        const ticketDetails = JSON.parse(body);
        sendResponse(ticketDetails.fields.description, callback);
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
    
    // now create an issue
    const optionsCreateNewTicket = {
        url: jiraEndpoint + '/issue/',
        auth: {
            username: jiraUser,
            password: jiraPassword
        },
        json: true,
        body: {
            "fields": {
                "project":
                {
                    "key": projectKey
                },
                "summary": issueSummary,
                "description": issueDescription,
                "issuetype": {
                    "name": issueType
                }
            }
        }
    }

    // make JIRA Post call 
    request.post(optionsCreateNewTicket, function(err, response, body) {
        if (err) {
            console.log("Error: " + err);
            return callback(null, err);
        }

        const result = JSON.parse(body);
        sendResponse(result.self, callback);

    });
    
}


