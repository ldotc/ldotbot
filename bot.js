// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { QnAMaker } = require('botbuilder-ai');
const DentistScheduler = require('./dentistScheduler');
const IntentRecognizer = require("./intentrecognizer")

class EchoBot extends ActivityHandler {
    constructor(configuration, qnaOptions) {
        super();
        if (!configuration) throw new Error('[QnaMakerBot]: Missing parameter. configuration is required');
        
        // create a QnAMaker connector
        this.qnaMaker = new QnAMaker(configuration.QnAConfiguration, qnaOptions);
        // create a DentistScheduler connector
        this.dentistScheduler = new DentistScheduler(configuration.SchedulerConfiguration);

        // create a LUIS connector
        this.intentRecognizer = new IntentRecognizer(configuration.LuisConfiguration);

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            // Send user input to QnA Maker
            const qnaResults = await this.qnaMaker.getAnswers(context);
            // Send user input to LUIS
            const LuisResult = await this.intentRecognizer.executeLuisQuery(context);
            
            // Determine which service to respond with //
            if (LuisResult.luisResult.prediction.topIntent === "getAvailability" &&
                LuisResult.intents.getAvailability.score > .6 &&
                LuisResult.entities.$instance && 
                LuisResult.entities.$instance.timeday  && 
                LuisResult.entities.$instance.timeday[0]
            ) {
                const timeday = LuisResult.entities.$instance.timeday[0].text;
                // Call api with time entity info
                const getAvailableTime = "I have a few spots for " + timeday;
                console.log(getAvailableTime)
                await context.sendActivity(getAvailableTime);
                await next();
                return;
            } 

            // If an answer was received from QnA Maker, send the answer back to the user.
            if (qnaResults[0]) {
                console.log(qnaResults[0])
                await context.sendActivity(`${qnaResults[0].answer}`);
            }
            else {
                // If no answers were returned from QnA Maker, reply with help.
                await context.sendActivity(`I'm not sure`
                + 'I found an answer to your question'
                + `You can ask me questions about our dental services like "Do you treat children?' or tell me what time you want an appointment like "today"`);
            }
            await next();
        });


        /*this.onMessage(async (context, next) => {
            const replynpmheText = `Echo: ${ context.activity.text }`;
            await context.sendActivity(MessageFactory.text(replyText, replyText));
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });*/

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Welcome. I am ldot. Do you have a question about our services? Or I can book you a session with a dentist. You can ask me a dental health question like "what appointments are available" or "book tomorrow".';
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcomeText, welcomeText));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;
