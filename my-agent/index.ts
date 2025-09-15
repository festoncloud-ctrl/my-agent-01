import {generateText} from 'ai';
import {google} from '@ai-sdk/google';

// specify the model application
const { text } = await generateText({
  model: google("models/gemini-2.5-flash"),   
  prompt: "What is an AI agent? What is their impact on Health and Defense", 
});

console.log(text); 
